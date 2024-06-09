import qxs from '@stefanschramm/qxs';
import { BrowserEnvironment } from './BrowserEnvironment';
import { BrowserLogger } from './BrowserLogger';

addEventListener('load', () => new WebsiteInputHandler());

/**
 * Handle input in browser context.
 *
 * The automatic processing page is called like this:
 *
 * http://localhost:5173/process/#country=de&language=de&query=w+Berlin
 */
class WebsiteInputHandler {
  private readonly input = document.getElementById('textInput') as HTMLInputElement;
  private readonly status = document.getElementById('status') as HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queryProcessor: any; // TODO: Export QueryProcessor type in qxs?
  private readonly logger = new BrowserLogger();

  public constructor() {
    qxs.Logger.setHandler(this.logger);
    qxs.Logger.setVerbosity(3);
    window.onhashchange = () => {
      this.load();
    };
    this.load();
  }

  private load(): void {
    qxs.Logger.debug('Initializing');
    const hashParameters = this.getHashParameters();
    const environment = new BrowserEnvironment(hashParameters);
    const namespaceDispatcher = new qxs.NamespaceDispatcher([
      new qxs.RemoteSingleJsonNamespaceSourceHandler('/data.json'),
      new qxs.InPlaceNamespaceSourceHandler(),
      new qxs.UrlNamespaceSourceHandler(),
      new qxs.GithubNamespaceSourceHandler(),
    ]);
    const shortcutDatabase = new qxs.ObjectShortcutDatabase(namespaceDispatcher);

    this.queryProcessor = new qxs.QueryProcessor(environment, shortcutDatabase);

    if (this.isProcessPage()) {
      this.processProcessPage(hashParameters['query']);
    } else {
      const button = document.getElementById('submitButton');
      if (!button) {
        return;
      }
      button.onclick = (ev) => {
        this.handleInput(ev.ctrlKey);
      };

      this.input.onkeyup = (ev) => {
        if (ev.key === 'Enter') {
          this.handleInput(ev.ctrlKey);
        } else {
          this.refresh();
        }
      };
      this.input.focus();
    }
  }

  private isProcessPage(): boolean {
    return document.getElementById('process') !== null;
  }

  private async processProcessPage(query: string | undefined) {
    if (query === undefined) {
      alert('query parameter was not set.');
      return;
    }
    const result = await this.queryProcessor.process(query);

    if (result.status === qxs.QueryProcessingResultStatus.Success) {
      if (result.url !== undefined) {
        document.body.innerHTML = `Loading ${result.url}`;
        document.location.href = result.url;
      }
    } else {
      console.error(result);
      alert('Not found / problem.');
    }
  }

  private getHashParameters(): Record<string, string> {
    const parameters: Record<string, string> = {};
    if (window.location.hash === '') {
      return parameters;
    }

    const pairs = window.location.hash.substring(1).split('&');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (v === undefined) {
        continue; // invalid syntax
      }
      parameters[k] = decodeURIComponent(v.replace(/\+/g, '%20'));
    }

    return parameters;
  }

  private async refresh() {
    const result = await this.queryProcessor.process(this.input?.value ?? '');
    switch (result.status) {
      case qxs.QueryProcessingResultStatus.Success:
        this.status.textContent = '-> ' + result.url;
        break;
      default:
        this.status.textContent = '?';
        break;
    }
  }

  private async handleInput(newTab: boolean = false) {
    const result = await this.queryProcessor.process(this.input?.value ?? '');

    if (result.status === qxs.QueryProcessingResultStatus.Success) {
      if (result.url !== undefined) {
        if (newTab) {
          this.input.value = '';
          window.setTimeout(() => {
            // Timeout to create new tab instead of new window
            window.open(result.url, '_blank');
          }, 1);
        } else {
          this.status.textContent = `Loading ${result.url}...`;
          document.location = result.url;
        }
      }
    } else {
      console.error(result);
      alert('Not found / problem.');
    }
  }
}
