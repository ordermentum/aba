const moment = require('moment');
const ABA = require('../');

const PAYMENT = {
  bsb: '013-999',
  account: '123456',
  transactionCode: 50,
  amount: 1337.42,
  accountTitle: 'French Coffee',
  reference: 'Order 132',
  traceBsb: '013-666',
  traceAccount: '567890',
  remitter: 'Vault',
};

describe('ABA', () => {
  describe('.generate', () => {
    it('must return header in ABA format', () => {
      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
      });

      let header = '0';
      header += '       '; // Optional Bank/State/Branch
      header += '         '; // Optional account
      header += ' '; // Reserved
      header += '01'; // Static sequence number
      header += 'ANZ'; // Financial institution
      header += '       '; // Reserved
      header += 'Company                   '; // User preferred name
      header += '001337'; // User id number
      header += 'Creditors   '; // Description of payments
      header += moment().format('DDMMYY'); // Date to be processed
      header += '    '; // Time to be processed
      header += '                                    '; // Reserved
      expect(header.length).toBe(120);

      const rows = aba.generate([PAYMENT]).split(/\r\n/);
      expect(rows[0]).toBe(header);
    });

    it('must return payment rows in ABA format', () => {
      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
        time: new Date('2014-07-05T00:08:00.000Z'),
      });

      let row = '1';
      row += '013-999'; // Bank/State/Branch
      row += '   123456'; // Account
      row += ' '; // Optional tax
      row += '50'; // Transaction code
      row += '0000133742'; // Amount
      row += 'French Coffee                   '; // Account title
      row += 'Order 132         '; // Reference
      row += '013-666'; // Trace bank/state/branch
      row += '   567890'; // Trace account
      row += 'Vault           '; // Remitter
      row += '00000000'; // Tax amount
      expect(row.length).toBe(120);

      const payment = {
        bsb: '013-999',
        account: '123456',
        transactionCode: 50,
        amount: 1337.42,
        accountTitle: 'French Coffee',
        reference: 'Order 132',
        traceBsb: '013-666',
        traceAccount: '567890',
        remitter: 'Vault',
      };

      const rows = aba.generate([payment]).split(/\r\n/);
      expect(rows[1]).toBe(row);
    });

    it('must return footer in ABA format', () => {
      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
        time: new Date('2014-07-05T00:08:00.000Z'),
      });

      let footer = '7';
      footer += '999-999'; // Reserved
      footer += '            '; // Reserved
      footer += '0000000000'; // Credit minus debit total
      footer += '0000000000'; // Credit total
      footer += '0000000000'; // Debit total
      footer += '                        '; // Reserved
      footer += '000003'; // Payment count
      footer += '                                        '; // Reserved
      expect(footer.length).toBe(120);

      const payment = Object.assign({}, PAYMENT, { amount: 0 });
      const payments = [payment, payment, payment];
      const rows = aba.generate(payments).split(/\r\n/);
      expect(rows[4]).toBe(footer);
    });

    it('must use given BSB and account', () => {
      const aba = new ABA({
        bsb: '013-999',
        account: '123456',
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
      });

      const rows = aba.generate([PAYMENT]).split(/\r\n/);
      expect(rows[0].slice(1, 17)).toBe('013-999   123456');
    });

    it('must leave time blank if only date given', () => {
      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
        date: new Date(1987, 5, 18),
      });

      const rows = aba.generate([PAYMENT]).split(/\r\n/);
      expect(rows[0].slice(74, 84)).toBe('180687    ');
    });

    it('must use current date if not given', () => {
      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
      });

      const rows = aba.generate([PAYMENT]).split(/\r\n/);
      expect(rows[0].slice(74, 84)).toBe(moment().format('DDMMYY    '));
    });

    it('must use given time', () => {
      const time = new Date('2014-07-05T00:08:00.000Z');

      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
        time,
      });

      const rows = aba.generate([PAYMENT]).split(/\r\n/);
      expect(rows[0].slice(74, 84)).toBe(moment(time).format('DDMMYYHHmm'));
    });

    it('must use given tax and tax amount', () => {
      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
        time: new Date('2014-07-05T00:08:00.000Z'),
      });

      const payment = {
        bsb: '013-999',
        account: '123456',
        transactionCode: 50,
        amount: 1337.42,
        accountTitle: 'French Coffee',
        reference: 'Order 132',
        traceBsb: '013-666',
        traceAccount: '567890',
        remitter: 'Vault',
        tax: 'X',
        taxAmount: 666.13,
      };

      const rows = aba.generate([payment]).split(/\r\n/);
      expect(rows[1].slice(17, 18)).toBe('X');
      expect(rows[1].slice(112, 120)).toBe('00066613');
    });

    it('must sum up credit and debit totals', () => {
      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
        time: new Date('2014-07-05T00:08:00.000Z'),
      });

      const defaults = {
        bsb: '666-1337',
        account: '123456',
        accountTitle: 'Transfer',
        reference: 'Order 132',
        traceBsb: '013-666',
        traceAccount: '567890',
        remitter: 'Vault',
      };

      const creditA = Object.assign({}, defaults, {
        amount: 1337.42,
        transactionCode: 50,
      });
      const creditB = Object.assign({}, defaults, {
        amount: 512.64,
        transactionCode: 50,
      });
      const debitA = Object.assign({}, defaults, {
        amount: 666.69,
        transactionCode: 13,
      });
      const debitB = Object.assign({}, defaults, {
        amount: 616.66,
        transactionCode: 13,
      });
      const payments = [creditA, debitA, creditB, debitB];

      let footer = '';
      footer += '0000056671'; // Credit minus debit total
      footer += '0000185006'; // Credit total
      footer += '0000128335'; // Debit total

      const rows = aba.generate(payments).split(/\r\n/);
      expect(rows[5].substr(20, 30)).toBe(footer);
    });

    it('must return a negative net as positive', () => {
      const aba = new ABA({
        bank: 'ANZ',
        user: 'Company',
        userNumber: 1337,
        description: 'Creditors',
        time: new Date('2014-07-05T00:08:00.000Z'),
      });

      const payments = [
        Object.assign({}, PAYMENT, {
          transactionCode: ABA.CREDIT,
          amount: 666.66,
        }),
        Object.assign({}, PAYMENT, {
          transactionCode: ABA.DEBIT,
          amount: 1337.42,
        }),
      ];

      const footer = aba.getFooter(payments);
      expect(footer.length).toBe(2);
      expect(footer.credit).toBe('66666');
      expect(footer.debit).toBe('133742');
      expect(footer.net).toBe('67076');

      let result = '';
      result += '0000067076'; // Credit minus debit total
      result += '0000066666'; // Credit total
      result += '0000133742'; // Debit total

      const rows = aba.generate(payments).split(/\r\n/);
      expect(rows[3].substr(20, 30)).toBe(result);
    });
  });
});
