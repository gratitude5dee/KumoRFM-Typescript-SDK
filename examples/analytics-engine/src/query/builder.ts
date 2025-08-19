export class PQLBuilder {
  private parts: string[] = [];
  private hasPredict = false;
  private hasFor = false;

  predict(expr: string): PQLBuilder {
    this.parts.push(`PREDICT ${expr}`);
    this.hasPredict = true;
    return this;
  }

  for(entity: string): PQLBuilder {
    this.parts.push(`FOR ${entity}`);
    this.hasFor = true;
    return this;
  }

  where(filter: string): PQLBuilder {
    this.parts.push(`WHERE ${filter}`);
    return this;
  }

  build(): string {
    if (!this.hasPredict || !this.hasFor) {
      throw new Error('PQL requires predict() and for()');
    }
    return this.parts.join(' ');
  }
}
