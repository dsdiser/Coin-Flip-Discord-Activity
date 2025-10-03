import { CoinResult } from '../coin/Coin';

// Effect for after coin lands, should impact some sort of background animation
interface CoinEffectProps {
  triggered: CoinResult;
  onComplete: () => void;
}

export const CoinEffect: React.FC<CoinEffectProps> = ({ triggered, onComplete }) => {
  if (!triggered) {
    return null;
  }

  const finishedAnimation = () => {
    onComplete();
  };
  return null;
};
