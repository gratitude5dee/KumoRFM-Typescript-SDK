export class PQLBuilder {
  private q: string[] = [];
  predict(expr: string): PQLBuilder {
    this.q.push(`PREDICT ${expr}`);
    return this;
  }
  for(where: string): PQLBuilder {
    this.q.push(`FOR ${where}`);
    return this;
  }
  build(): string {
    return this.q.join(' ');
  }
}
