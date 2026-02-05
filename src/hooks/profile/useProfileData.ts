/**
 * useProfileData Hook (RTK Query Version)
 * Manages profile data fetching using cache-first RTK Query hooks.
 * Eliminates loading spinners by always serving cached data if available.
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { RootState } from '../../store/store'; // Adjust import path
import {
  useGetProfileQuery,
  useGetOwnedAvatarsQuery,
  useGetOwnedFramesQuery, // Assumed to exist based on profileApi.ts
} from '../../store/api/profileApi'; // Adjust import path
import {
  clearError as clearSliceError,
  clearProfile as clearSliceProfile,
} from '../../store/profileSlice'; // Adjust based on usage
import { logger } from '../../lib/utils/logger';

export const useProfileData = () => {
  const dispatch = useDispatch();
  const isFocused = useIsFocused();

  // Auth state
  const authState = useSelector((state: RootState) => state.auth);
  const isAuthenticated = authState.isAuthenticated && !!authState.token;

  // 1. RTK Query Hooks - Always called, data is consistent
  // skip: !isAuthenticated ensures we don't query if logged out
  const {
    data: profileData,
    isLoading: isProfileLoading,
    isFetching: isProfileFetching,
    error: profileError,
    refetch: refetchProfile,
  } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated,
    // Refetch logic handled by tags, but we can also use refetchOnFocus if desired
    // refetchOnFocus: true,
    // refetchOnMountOrArgChange: true,
  });

  const {
    data: avatars = [],
    isLoading: isAvatarsLoading,
    refetch: refetchAvatars,
  } = useGetOwnedAvatarsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const {
    data: frames = [],
    isLoading: isFramesLoading,
    refetch: refetchFrames,
  } = useGetOwnedFramesQuery(undefined, {
    skip: !isAuthenticated,
  });

  // 2. Refetch triggers (Silent background update)
  useEffect(() => {
    if (isFocused && isAuthenticated) {
      // Trigger silent background refetch when screen is focused
      // This keeps data fresh without showing spinners
      refetchProfile();
      refetchAvatars();
      refetchFrames();
    }
  }, [isFocused, isAuthenticated, refetchProfile, refetchAvatars, refetchFrames]);

  // 3. Error Handling - Monitor mismatch
  useEffect(() => {
    if (profileData && authState.user?.email) {
      const profileEmail = profileData.email?.toLowerCase();
      const authEmail = authState.user.email?.toLowerCase();

      if (profileEmail && authEmail && profileEmail !== authEmail) {
        logger.warn('Profile email mismatch - clearing profile', 'PROFILE');
        dispatch(clearSliceProfile());
        // Optional: Logout or force refetch?
      }
    }
  }, [profileData, authState.user?.email, dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearSliceError());
  }, [dispatch]);

  // 4. Computed State
  // "isLoading" Logic:
  // We want "Zero Loaders".
  // If we have cached data, isLoading should be FALSE even if isFetching is true.
  // We only report true isLoading if we have NO DATA and are fetching.
  const hasData = !!profileData;
  const isLoading = (isProfileLoading && !hasData) || (!hasData && isProfileFetching);

  // Combined function to manually refresh everything (e.g., Pull to Refresh)
  const refetchAll = useCallback(async () => {
    return Promise.all([refetchProfile(), refetchAvatars(), refetchFrames()]);
  }, [refetchProfile, refetchAvatars, refetchFrames]);

  return {
    profileData: profileData || null, // Ensure null if undefined
    avatars, // Defaults to [] above
    frames, // Defaults to [] above
    isLoading, // Smart loading state
    isUpdating: false, // Mutation state would go here if we used useUpdateMutation
    error: profileError ? 'Failed to load profile' : null,
    clearError,
    refetch: refetchAll, // Expose refetch for ProfileScreen
  };
};
