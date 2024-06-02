import { type Environment, type NamespaceSource } from '@stefanschramm/qxs';

export class BrowserEnvironment implements Environment {
  private readonly language: string;
  private readonly country: string;
  private readonly defaultKeyword: string | undefined;

  public constructor(parameters: Record<string, string>) {
    const [browserLanguage, browserCountry] = navigator.language.split('-');
    this.country = parameters['country'] ?? browserCountry.toLowerCase() ?? 'de';
    this.language = parameters['language'] ?? browserLanguage ?? 'de';
    this.defaultKeyword = undefined;
    console.log(
      `Environment initialized - language: ${this.language}, country: ${this.country}, defaultKeyword: ${this.defaultKeyword}`,
    );
  }

  public getNamespaces(): NamespaceSource[] {
    return [`.${this.getCountry()}`, this.getLanguage(), 'o'];
  }

  public getCountry(): string {
    return this.country;
  }

  public getLanguage(): string {
    return this.language;
  }

  public getDefaultKeyword(): string | undefined {
    return this.defaultKeyword;
  }
}
