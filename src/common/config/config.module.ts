export class ConfigModule {
  public static get<T = string>(key: string, defaultValue?: T): T | undefined {
    const value = process.env[key];
    return (value as unknown as T) ?? defaultValue;
  }
}
