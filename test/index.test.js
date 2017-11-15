const ABA = require('../index');

describe('ABA', () => {
  it('works', () => {
    const aba = new ABA();
    expect(aba).not.toBe(null);
  });

  it('throws error', () => {
    const aba = new ABA();
    expect(() => aba.generate([])).toThrowError();
  });

  it('generates', () => {
    const aba = new ABA({
      bsb: '',
      account: '',
      bank: '',
      user: '',
      userNumber: 1234,
      description: 'Creditors',
    });
    const transaction = {
      bsb: '061021',
      tax: 10,
      transactionCode: ABA.DEBIT,
      account: '123456',
      amount: '12.00',
      accountTitle: 'test',
      reference: '1234',
      traceBsb: '061123',
      traceAccount: '1234567',
      remitter: '1235',
      taxAmount: 12,
    };
    expect(aba.generate([transaction])).not.toBe(undefined);
  });
});
