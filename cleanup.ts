// cleanup.ts - UPDATED
import { cleanupDemoData, refreshAllLeaderboards } from './services/storageService';

async function runCleanup() {
  console.log('🧹 Cleaning up demo data from database...');
  try {
    await cleanupDemoData();
    console.log('✅ Demo data cleaned from database');
    
    await refreshAllLeaderboards();
    console.log('✅ Leaderboards refreshed with real data');
    
    console.log('🎉 Cleanup completed successfully! Ready for deployment.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

runCleanup();