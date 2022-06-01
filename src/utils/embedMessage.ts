import { TransactionEvent } from '../../types/events';

const makeEmbeddedMessage = async (data: TransactionEvent): Promise<object> => {
  const currentPrice = await data.getCurrentPrice();

  const dollarValue = data.amount * currentPrice;

  const parsedDollarValue = dollarValue.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumSignificantDigits: 2,
    maximumSignificantDigits: dollarValue.toFixed(3).length - 1,
  });

  const embed = {
    title: `📣 ${data.type === 'sell' ? 'Sell' : 'Buy'} Alert! 📣`,
    color: '#E50000',
    fields: [
      {
        name: `Amount of ${data.name} ${data.type === 'sell' ? 'sold' : 'bought'}:`,
        value: data.amount.toLocaleString(),
      },
      {
        name: '$USD value',
        value: parsedDollarValue,
      },
      {
        name: 'TX Hash',
        value: data.hash,
      },
      {
        name: 'View the transaction',
        value: `${data.explorer}${data.hash}`,
      },
    ],
    timestamp: new Date(),
  };

  return embed;
};

export default makeEmbeddedMessage;
