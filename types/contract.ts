export type Result = {
  from: string;
  to: string;
  value: string;
};

export type Event = {
  returnValues: Result;
  transactionHash: string;
};
