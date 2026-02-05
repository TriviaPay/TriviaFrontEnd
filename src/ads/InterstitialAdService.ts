import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { AD_UNITS } from './adUnits';
import { logger } from '../lib/utils/logger';

class InterstitialAdService {
    private interstitialAd: InterstitialAd | null = null;
    private isLoaded: boolean = false;
    private isLoading: boolean = false;
    private onCloseCallback: (() => void) | null = null;

    constructor() {
        this.createAd();
    }

    private createAd() {
        // Prevent duplicate creation
        if (this.interstitialAd) {
            return;
        }

        try {
            // Direct usage without casting, using the imported class
            this.interstitialAd = InterstitialAd.createForAdRequest(AD_UNITS.INTERSTITIAL, {
                requestNonPersonalizedAdsOnly: true,
            });

            if (!this.interstitialAd) return;

            // Event Listeners
            this.interstitialAd.addAdEventListener(
                AdEventType.LOADED,
                () => {
                    this.isLoaded = true;
                    this.isLoading = false;
                    logger.debug('Interstitial Ad loaded', 'AD_SERVICE');
                }
            );

            this.interstitialAd.addAdEventListener(
                AdEventType.CLOSED,
                () => {
                    this.isLoaded = false;
                    logger.debug('Interstitial Ad closed', 'AD_SERVICE');

                    if (this.onCloseCallback) {
                        this.onCloseCallback();
                        this.onCloseCallback = null;
                    }

                    // Reload next ad automatically
                    this.loadInterstitialAd();
                }
            );

            this.interstitialAd.addAdEventListener(
                AdEventType.ERROR,
                (error) => {
                    this.isLoaded = false;
                    this.isLoading = false;
                    logger.warn('Interstitial Ad failed to load', 'AD_SERVICE', error);
                }
            );
        } catch (error) {
            logger.error('Failed to create Interstitial Ad instance', 'AD_SERVICE', error);
        }
    }

    /**
     * Loads the interstitial ad if not already loaded or loading.
     */
    public loadInterstitialAd() {
        if (this.isLoaded || this.isLoading || !this.interstitialAd) {
            return;
        }

        try {
            this.isLoading = true;
            this.interstitialAd.load();
        } catch (error) {
            this.isLoading = false;
            logger.error('Failed to load Interstitial Ad', 'AD_SERVICE', error);
        }
    }

    /**
     * Shows the interstitial ad if ready.
     * @param onClose - Callback to execute when ad connects or if ad fails to show.
     * @returns true if ad was shown, false otherwise.
     */
    public showInterstitialAd(onClose?: () => void): boolean {
        // If ad is ready, show it
        if (this.isLoaded && this.interstitialAd) {
            this.onCloseCallback = onClose || null;
            try {
                this.interstitialAd.show();
                return true;
            } catch (error) {
                logger.error('Failed to show Interstitial Ad', 'AD_SERVICE', error);
                // Fallback: execute callback immediately if show fails
                if (onClose) onClose();
                return false;
            }
        }

        // If not ready, try to load for next time and execute callback immediately
        if (!this.isLoading) {
            this.loadInterstitialAd();
        }

        if (onClose) onClose();
        return false;
    }
}

export const interstitialAdService = new InterstitialAdService();
