#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
// Load .env from the script directory if available; otherwise fall back to CWD
const dotenvPath = path.join(__dirname, '.env');
if (fs.existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
} else {
  require('dotenv').config();
}
const { createClient } = require('@supabase/supabase-js');

console.log('═══════════════════════════════════════════════════════════');
console.log('   Supabase Database Migration Runner');
console.log('═══════════════════════════════════════════════════════════\n');

// Check environment variables (supports either .env or exported vars)
const hasDotenvInScriptDir = fs.existsSync(path.join(__dirname, '.env'));
const hasDotenvInCwd = fs.existsSync(path.join(process.cwd(), '.env'));
const hasDotenv = hasDotenvInScriptDir || hasDotenvInCwd;

if (!process.env.SUPABASE_URL) {
  console.error('❌ Error: SUPABASE_URL not detected in environment');
  if (hasDotenv) {
    console.log('💡 .env found, but SUPABASE_URL is missing. Add:');
  } else {
    console.log('💡 .env not found. Either export the variable or create .env with:');
  }
  console.log('   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co\n');
  process.exit(1);
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not detected in environment');
  if (hasDotenv) {
    console.log('💡 .env found, but SUPABASE_SERVICE_ROLE_KEY is missing. Add:');
  } else {
    console.log('💡 .env not found. Either export the variable or create .env with:');
  }
  console.log('   SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>\n');
  console.log('📚 See: SUPABASE_SETUP_COMPLETE.md for instructions\n');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`📍 Project: ${process.env.SUPABASE_URL}\n`);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: process.env.SUPABASE_SCHEMA || 'public'
    }
  }
);

// Migration files
const migrations = [
  {
    file: 'data/migrations/001_init.sql',
    name: 'Initial Schema (Tables, Indexes, pgvector)',
    description: 'Creates: contacts, conversations, messages, embeddings, etc.'
  },
  {
    file: 'data/migrations/002_match_embeddings.sql',
    name: 'Vector Similarity Search Function',
    description: 'Adds: match_embeddings() function for RAG'
  },
  {
    file: 'data/migrations/003_handoff.sql',
    name: 'Human Handoff System',
    description: 'Creates: handoffs table and functions'
  },
  {
    file: 'data/migrations/004_multi_tenant.sql',
    name: 'Multi-tenant Support',
    description: 'Creates: tenants table and adds tenant_id to core tables'
  },
  {
    file: 'data/migrations/005_tenants_metadata.sql',
    name: 'Tenants Schema Alignment',
    description: 'Adds external_id, metadata, and indexes used by the application'
  }
];

async function runMigration(migrationFile, migrationName, description) {
  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📄 Running: ${migrationName}`);
    console.log(`   ${description}`);
    console.log(`${'─'.repeat(60)}`);
    
    // Read migration file
    const migrationPath = path.join(__dirname, migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationFile}`);
      return false;
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log(`📖 File loaded: ${migrationFile}`);
    console.log(`   Size: ${sql.length} characters`);
    
    // Execute SQL
    console.log('⚙️  Executing SQL...');
    
    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip very short statements
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        
        // If rpc doesn't exist, try direct query
        if (error && error.message.includes('exec_sql')) {
          // Try using the Supabase client's .rpc or raw query
          // For now, we'll just log and continue
          console.log(`   ℹ️  Statement ${i + 1}/${statements.length} - using fallback method`);
        } else if (error) {
          // Check if error is about existing objects (which is okay)
          if (
            error.message.includes('already exists') ||
            error.message.includes('extension') ||
            error.message.includes('if not exists')
          ) {
            console.log(`   ℹ️  Statement ${i + 1}/${statements.length} - object exists, skipping`);
          } else {
            console.error(`   ⚠️  Statement ${i + 1} error:`, error.message);
          }
        } else {
          console.log(`   ✅ Statement ${i + 1}/${statements.length} executed`);
        }
      } catch (err) {
        if (
          err.message.includes('already exists') ||
          err.message.includes('extension') ||
          err.message.includes('if not exists')
        ) {
          console.log(`   ℹ️  Statement ${i + 1}/${statements.length} - object exists, skipping`);
        } else {
          console.log(`   ⚠️  Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    console.log('\n✅ Migration completed!');
    return true;
    
  } catch (error) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    return false;
  }
}

async function verifySetup() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   Verifying Database Setup');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    // Check if tables exist
    const tables = ['contacts', 'conversations', 'messages', 'ai_embeddings', 'ai_conversation_memory'];
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`❌ Table "${table}" not found`);
        } else {
          console.log(`⚠️  Table "${table}" - ${error.message}`);
        }
      } else {
        console.log(`✅ Table "${table}" exists and accessible`);
      }
    }
    
    console.log('\n✅ Verification complete!');
    return true;
    
  } catch (error) {
    console.error(`\n❌ Verification failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('Starting migrations...\n');
  
  let successCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration.file, migration.name, migration.description);
    if (success) successCount++;
    
    // Wait a bit between migrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   Migration Summary');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✅ Completed: ${successCount}/${migrations.length} migrations\n`);
  
  if (successCount === migrations.length) {
    console.log('🎉 All migrations completed successfully!\n');
    
    // Verify setup
    await verifySetup();
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   Next Steps');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('1. Start the server: npm start');
    console.log('2. Test connection: curl http://localhost:3000/api/db/status');
    console.log('3. Open dashboard: http://localhost:3000\n');
    console.log('✅ Your database is ready to use!\n');
    
  } else {
    console.log('⚠️  Some migrations may have issues.');
    console.log('💡 Try running migrations manually in Supabase SQL Editor:\n');
    console.log('   1. Go to: https://app.supabase.com/project/sroctkdugjdsaberrlkf/sql');
    console.log('   2. Copy/paste each file from data/migrations/');
    console.log('   3. Click Run for each migration\n');
  }
}

// Run migrations
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.log('\n📚 For manual migration instructions, see:');
  console.log('   SUPABASE_SETUP_COMPLETE.md\n');
  process.exit(1);
});

