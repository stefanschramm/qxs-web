import qxs from '@stefanschramm/qxs';
import { BrowserEnvironment } from './BrowserEnvironment';

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
  private readonly queryProcessor: any; // TODO

  public constructor() {
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
      button.onclick = () => {
        this.handleInput();
      };

      this.input.onkeyup = (ev) => {
        if (ev.key === 'Enter') {
          this.handleInput();
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
      parameters[k] = decodeURI(v.replace(/\+/g, ' '));
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

  private async handleInput() {
    const result = await this.queryProcessor.process(this.input?.value ?? '');

    if (result.status === qxs.QueryProcessingResultStatus.Success) {
      if (result.url !== undefined) {
        window.open(result.url, '_blank');
        this.input.value = '';
      }
    } else {
      console.error(result);
      alert('Not found / problem.');
    }
  }
}
