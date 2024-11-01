import qxs from '@stefanschramm/qxs';
import { BrowserEnvironment } from './BrowserEnvironment';
import { BrowserLogger } from './BrowserLogger';

addEventListener('load', () => new WebsiteInputHandler());

/**
 * Handle input in browser context.
 *
 * The automatic processing page is called like this:
 *
 * http://localhost:5173/#country=de&language=de&query=w+Berlin
 */
class WebsiteInputHandler {
  private readonly input = document.getElementById('textInput') as HTMLInputElement;
  private readonly status = document.getElementById('status') as HTMLDivElement;
  private readonly searchResults = document.getElementById('searchResults') as HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private shortcutDatabase: any; // TODO: Export ShortcutDatabase type in qxs?
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queryProcessor: any; // TODO: Export QueryProcessor type in qxs?
  private environment: BrowserEnvironment;
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
    this.environment = new BrowserEnvironment(hashParameters);
    const namespaceDispatcher = new qxs.NamespaceDispatcher([
      new qxs.RemoteSingleJsonNamespaceSourceHandler('/data.json'),
      new qxs.InPlaceNamespaceSourceHandler(),
      new qxs.UrlNamespaceSourceHandler(),
      new qxs.GithubNamespaceSourceHandler(),
    ]);
    this.shortcutDatabase = new qxs.ObjectShortcutDatabase(namespaceDispatcher);
    this.queryProcessor = new qxs.QueryProcessor(this.environment, this.shortcutDatabase);

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

    if (hashParameters['query'] !== undefined) {
      // Used as process page
      this.input.value = hashParameters['query'];
      this.handleInput(false);
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
        this.searchResults.innerHTML = '';
        this.status.textContent = '-> ' + result.url;
        break;
      default:
        this.status.textContent = '?';
        if (this.input?.value !== undefined && this.input?.value !== '' && this.input.value.length > 2) {
          this.search(this.input.value);
        } else {
          this.searchResults.innerHTML = '';
        }
        break;
    }
  }

  private async search(query: string) {
    const results = await this.shortcutDatabase.search(
      query,
      this.environment.getLanguage(),
      this.environment.getNamespaces(),
    );

    this.searchResults.innerHTML = '';
    for (const k in results) {
      const shortcut = results[k];
      const keyword = k.split(' ')[0];
      const entryElement = document.createElement('div');
      const keywordElement = document.createElement('b');
      const args = shortcut.url === undefined ? [] : qxs.getArgumentPlaceholderNames(shortcut.url);
      const keywordText = args.length > 0 ? `${keyword} ${args.join(', ')}: ` : `${keyword}: `;
      keywordElement.appendChild(document.createTextNode(keywordText));
      entryElement.appendChild(keywordElement);
      entryElement.appendChild(document.createTextNode(shortcut.title));
      this.searchResults.appendChild(entryElement);
    }
  }

  private async handleInput(newTab: boolean = false) {
    this.status.textContent = 'Processing query...';
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
      this.status.textContent = 'Error';
      console.error(result);
      alert('Not found / problem.');
    }
  }
}
