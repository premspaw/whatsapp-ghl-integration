const { getSupabase } = require('./services/db/supabaseClient');

async function testDatabaseFunction() {
  console.log('🔍 Testing database connection and functions...');
  
  const supabase = getSupabase();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    return;
  }
  
  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const { data: testData, error: testError } = await supabase
      .from('ai_embeddings')
      .select('count(*)')
      .limit(1);
    
    if (testError) {
      console.error('❌ Basic connection failed:', testError.message);
      return;
    }
    
    console.log('✅ Basic connection successful');
    
    // Check if we have any embeddings
    const { data: countData, error: countError } = await supabase
      .from('ai_embeddings')
      .select('*', { count: 'exact' });
    
    if (countError) {
      console.error('❌ Count query failed:', countError.message);
    } else {
      console.log(`📊 Total embeddings in database: ${countData?.length || 0}`);
    }
    
    // Test the match_embeddings function with a dummy vector
    console.log('2. Testing match_embeddings function...');
    const dummyVector = new Array(1536).fill(0.1); // Create a dummy 1536-dimensional vector
    
    const { data: matchData, error: matchError } = await supabase
      .rpc('match_embeddings', {
        query_embedding: dummyVector,
        match_count: 5,
        filter_conversation: null
      });
    
    if (matchError) {
      console.error('❌ match_embeddings function failed:', matchError.message);
      console.error('Full error:', matchError);
    } else {
      console.log('✅ match_embeddings function works');
      console.log(`📊 Returned ${matchData?.length || 0} results`);
      if (matchData && matchData.length > 0) {
        console.log('Sample result structure:', Object.keys(matchData[0]));
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDatabaseFunction().then(() => {
  console.log('🏁 Database test complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test crashed:', error);
  process.exit(1);
});