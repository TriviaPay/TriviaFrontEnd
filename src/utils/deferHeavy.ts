export const deferHeavy = (cb: () => void | Promise<void>): Promise<void> => {
  return new Promise(resolve => {
    const { InteractionManager } = require('react-native');
    InteractionManager.runAfterInteractions(async () => {
      await cb();
      resolve();
    });
  });
};
