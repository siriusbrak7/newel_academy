// test-supabase.js
import { supabase } from './services/supabaseClient.js';

async function testSupabase() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Simple query to check connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
    } else {
      console.log('Supabase connection successful!');
    }
    
    // Test 2: Check topics
    const { data: topics, error: topicsError } = await supabase
      .from('topics')
      .select('id, title')
      .limit(5);
    
    if (topicsError) {
      console.error('Topics query error:', topicsError);
    } else {
      console.log(`Found ${topics.length} topics`);
      topics.forEach(t => console.log(`- ${t.title} (${t.id})`));
    }
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testSupabase();