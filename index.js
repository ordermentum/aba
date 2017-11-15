const moment = require('moment');
const BigNumber = require('bignumber.js');
const sprintf = require('printf');

const toCents = number =>
  new BigNumber(number)
    .round(2)
    .times(100)
    .toFixed(2);
const sum = totals =>
  totals.reduce((p, v) => p.add(v), new BigNumber(0)).toFixed(2);
const difference = (credit, debit) =>
  new BigNumber(credit).sub(debit).toFixed(2);

const PAYMENT_FORMAT = [
  '1',
  '%(bsb)7s',
  '%(account)9s',
  '%(tax)1s',
  '%(transactionCode)02d',
  '%(amount)010d',
  '%(accountTitle)-32s',
  '%(reference)-18s',
  '%(traceBsb)7s',
  '%(traceAccount)9s',
  '%(remitter)-16s',
  '%(taxAmount)08d',
].join('');

// NOTE: Assuming the account in header is blank filled and right justified
// like the detail record, even though the spec from ANZ didn't specify it.
const HEADER_FORMAT = [
  '0',
  '%(bsb)7s',
  '%(account)9s',
  ' ',
  '01',
  '%(bank)-3s',
  '       ',
  '%(user)-26s',
  '%(userNumber)06d',
  '%(description)-12s',
  '%(date)6s',
  '%(time)4s',
  '                                    ',
].join('');

const FOOTER_FORMAT = [
  '7',
  '999-999',
  '            ',
  '%(net)010d',
  '%(credit)010d',
  '%(debit)010d',
  '                        ',
  '%(length)06d',
  '                                        ',
].join('');

class ABA {
  constructor(opts) {
    this.options = Object.assign({}, ABA.defaults, opts);
  }

  transaction(transaction) {
    return sprintf(
      PAYMENT_FORMAT,
      Object.assign({}, transaction, {
        amount: toCents(transaction.amount),
        taxAmount: toCents(transaction.taxAmount),
      })
    );
  }

  get header() {
    const header = this.options;
    const time = moment(header.time || header.date || new Date());

    return sprintf(
      HEADER_FORMAT,
      Object.assign({}, header, {
        date: time.format('DDMMYY'),
        time: header.time ? time.format('HHmm') : '',
      })
    );
  }

  footer(payments) {
    const credits = payments.filter(p => p.transactionCode === ABA.CREDIT);
    const debits = payments.filter(p => p.transactionCode === ABA.DEBIT);
    const credit = sum(credits.map(c => c.amount));
    const debit = sum(debits.map(d => d.amount));

    return sprintf(FOOTER_FORMAT, {
      // According to spec the net total was supposed to be an unsigned value of
      // credit minus debit (with no mention of underflow), but turns out they
      // really meant merely the difference between credit and debit.
      net: toCents(difference(credit, debit)),
      credit: toCents(credit),
      debit: toCents(debit),
      length: payments.length,
    });
  }

  generate(transactions = []) {
    // ABA requires at least one detail record.
    if (!transactions.length) {
      throw new Error('Please pass in at least one payment');
    }
    const formatted = transactions.map(payment =>
      this.transaction(Object.assign({}, ABA.PAYMENT_DEFAULTS, payment))
    );
    const footer = this.footer(transactions);
    return [this.header, ...formatted, footer].join('\r\n');
  }
}

ABA.PAYMENT_DEFAULTS = {
  tax: '',
  taxAmount: 0,
};

ABA.CREDIT = 50;
ABA.DEBIT = 13;

ABA.defaults = {
  bsb: '',
  account: '',
  description: '',
  time: '',
};

module.exports = ABA;
