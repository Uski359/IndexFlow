import { Interface, type Log } from 'ethers';

const iface = new Interface([
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
  'event RewardClaimed(address indexed user, uint256 amount)'
]);

export const STAKED_TOPIC =
  '0x00fdd58e6fa8b4b5d27bfb884a69e2f4e1eb4ae2b5b40443757f84db6468607f';
export const UNSTAKED_TOPIC =
  '0xa3f8b4c6a01a4ca28d9c4ad04615f3dd41a365cd18bf6954fa870f3c40804e0d';
export const REWARD_TOPIC =
  '0x2fae98a8c49b7d25f297f8882b5520fd4fc2d7500076ced2e3e5b4e29435fc2b';

export type StakingEventType = 'STAKED' | 'UNSTAKED' | 'REWARD_CLAIMED';

export interface ParsedStakingEvent {
  user: string;
  amount: string;
  eventType: StakingEventType;
}

export const parseStakingEvent = (log: Log): ParsedStakingEvent => {
  const parsed = iface.parseLog(log);

  if (!parsed) {
    throw new Error('Failed to parse staking log');
  }

  const [user, amount] = parsed.args;
  let eventType: StakingEventType = 'STAKED';

  if (parsed.name === 'Unstaked') {
    eventType = 'UNSTAKED';
  } else if (parsed.name === 'RewardClaimed') {
    eventType = 'REWARD_CLAIMED';
  }

  return {
    user,
    amount: amount.toString(),
    eventType
  };
};
