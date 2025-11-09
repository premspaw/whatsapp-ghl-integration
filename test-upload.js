const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function uploadFiles() {
  console.log('📁 Starting knowledge base upload test...\n');
  
  const testFiles = [
    'test-documents/company-info.md',
    'test-documents/faq.txt', 
    'test-documents/product-catalog.json'
  ];

  try {
    for (const filePath of testFiles) {
      const form = new FormData();
      const fileStream = fs.createReadStream(filePath);
      form.append('files', fileStream, path.basename(filePath));

      console.log(`📤 Uploading ${filePath}...`);
      
      const response = await axios.post(`${BASE_URL}/api/ai/knowledge/upload`, form, {
        headers: {
          ...form.getHeaders(),
        },
      });

      console.log(`✅ Upload successful for ${filePath}:`, response.data);
    }
    
    console.log('\n🎉 All files uploaded successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    return false;
  }
}

async function testRAGQueries() {
  console.log('🧠 Testing RAG (Retrieval-Augmented Generation) queries...\n');
  
  const testQueries = [
    "What is TechCorp's mission statement?",
    "How do I return a product?", 
    "What laptops do you sell and what are their prices?",
    "What are your business hours?",
    "Tell me about the UltraBook Pro specifications"
  ];

  try {
    for (const query of testQueries) {
      console.log(`❓ Query: "${query}"`);
      
      const response = await axios.post(`${BASE_URL}/api/ai/test-chat`, {
        message: query,
        conversationId: `test-rag-${Date.now()}`
      });

      if (response.data.success) {
        console.log(`✅ AI Response: ${response.data.reply}\n`);
      } else {
        console.log(`❌ Failed: ${response.data.error}\n`);
      }
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('❌ RAG query failed:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 Knowledge Base RAG Testing Suite\n');
  console.log('=' .repeat(50) + '\n');
  
  // Step 1: Upload test documents
  const uploadSuccess = await uploadFiles();
  
  if (!uploadSuccess) {
    console.log('❌ Upload failed, skipping RAG tests');
    return;
  }
  
  // Wait a moment for indexing to complete
  console.log('⏳ Waiting for indexing to complete...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 2: Test RAG queries
  await testRAGQueries();
  
  console.log('🏁 Testing complete!');
}

main().catch(console.error);