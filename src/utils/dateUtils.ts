/**
 * Date Utilities for Chat
 */

export const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getMessageDateLabel = (dateString: string | Date): string => {
    const date = new Date(dateString);
    const now = new Date();

    // Set times to 0 for accurate date comparison
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const diffTime = dNow.getTime() - dDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        // Show day name (e.g., Monday)
        return date.toLocaleDateString(undefined, { weekday: 'long' });
    } else {
        // Show full date
        return date.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'long',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
    }
};

/**
 * Checks if two dates are different days
 */
export const isDifferentDay = (date1: string | Date, date2: string | Date): boolean => {
    if (!date1 || !date2) return true;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() !== d2.getFullYear() ||
        d1.getMonth() !== d2.getMonth() ||
        d1.getDate() !== d2.getDate();
};

export default {
    getMessageDateLabel,
    isDifferentDay,
    formatDateForAPI,
};
