import { RewardedAd, RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNITS } from './adUnits';
import { logger } from '../lib/utils/logger';

class RewardedAdService {
    private rewardedAd: RewardedAd | null = null;
    private isLoaded: boolean = false;
    private isLoading: boolean = false;
    private onRewardEarnedCallback: (() => void) | null = null;

    constructor() {
        this.createAd();
    }

    private createAd() {
        if (this.rewardedAd) {
            return;
        }

        try {
            // Use createForAdRequest instead of createForAdUnit for v16+
            this.rewardedAd = RewardedAd.createForAdRequest(AD_UNITS.REWARDED, {
                requestNonPersonalizedAdsOnly: true,
            });

            if (!this.rewardedAd) return;

            this.rewardedAd.addAdEventListener(
                RewardedAdEventType.LOADED,
                () => {
                    this.isLoaded = true;
                    this.isLoading = false;
                    logger.debug('Rewarded Ad loaded', 'AD_SERVICE');
                }
            );

            this.rewardedAd.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                (reward) => {
                    logger.debug('User earned reward', 'AD_SERVICE', reward);
                    if (this.onRewardEarnedCallback) {
                        this.onRewardEarnedCallback();
                        this.onRewardEarnedCallback = null;
                    }
                }
            );

            this.rewardedAd.addAdEventListener(
                AdEventType.CLOSED,
                () => {
                    this.isLoaded = false;
                    logger.debug('Rewarded Ad closed', 'AD_SERVICE');
                    // Reset callback just in case it wasn't triggered (e.g. user closed before reward)
                    // Though EARNED_REWARD usually fires before CLOSED if earned.
                    this.onRewardEarnedCallback = null;

                    // Reload next ad automatically
                    this.loadRewardedAd();
                }
            );

            this.rewardedAd.addAdEventListener(
                AdEventType.ERROR,
                (error) => {
                    this.isLoaded = false;
                    this.isLoading = false;
                    logger.warn('Rewarded Ad failed to load', 'AD_SERVICE', error);
                }
            );
        } catch (error) {
            logger.error('Failed to create Rewarded Ad instance', 'AD_SERVICE', error);
        }
    }

    public loadRewardedAd() {
        if (this.isLoaded || this.isLoading || !this.rewardedAd) {
            return;
        }

        try {
            this.isLoading = true;
            this.rewardedAd.load();
        } catch (error) {
            this.isLoading = false;
            logger.error('Failed to load Rewarded Ad', 'AD_SERVICE', error);
        }
    }

    /**
     * Shows the rewarded ad if ready.
     * @param onRewardEarned - Callback to execute ONLY when reward is earned.
     */
    public showRewardedAd(onRewardEarned: () => void) {
        if (this.isLoaded && this.rewardedAd) {
            this.onRewardEarnedCallback = onRewardEarned;
            try {
                this.rewardedAd.show();
            } catch (error) {
                logger.error('Failed to show Rewarded Ad', 'AD_SERVICE', error);
                // Do NOT call callback if show fails or error occurs, as user didn't watch ad
                this.onRewardEarnedCallback = null;
            }
        } else {
            logger.warn('Rewarded Ad not ready', 'AD_SERVICE');
            // Try to load one for next time
            if (!this.isLoading) {
                this.loadRewardedAd();
            }
        }
    }

    public isAdLoaded(): boolean {
        return this.isLoaded;
    }
}

export const rewardedAdService = new RewardedAdService();
