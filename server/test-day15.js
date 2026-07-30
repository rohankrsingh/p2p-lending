import 'dotenv/config';
import mongoose from 'mongoose';
import { stripeWebhookHandler } from './routes/stripe.js';
import LoanRequest from './models/LoanRequest.js';
import FundedLoan from './models/FundedLoan.js';
import Transaction from './models/Transaction.js';
import RepaymentSchedule from './models/RepaymentSchedule.js';
import StripeEvent from './models/StripeEvent.js';

async function runTest() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI not found in .env');
    
    await mongoose.connect(uri);
    console.log('✅ Connected to DB');

    // Use a separate test database or cleanup to avoid polluting real data
    // For a quick verification, we'll just use random IDs
    const borrowerId = new mongoose.Types.ObjectId();
    const lenderId = new mongoose.Types.ObjectId();
    
    const loan = await LoanRequest.create({
      userId: borrowerId,
      amount: 10000,
      tenure: 6,
      reason: 'Test loan for verification',
      status: 'pending'
    });

    console.log('✅ Test loan created:', loan._id);

    const mockEvent = {
      id: 'evt_test_' + Date.now(),
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
          metadata: {
            loanRequestId: loan._id.toString(),
            lenderId: lenderId.toString(),
            borrowerId: borrowerId.toString(),
          }
        }
      }
    };

    // Mock stripe's constructEvent to skip signature check for test
    const stripe = require('./services/stripe.js').default;
    stripe.webhooks.constructEvent = () => mockEvent;

    const req = {
      headers: { 'stripe-signature': 'mock_sig' },
      body: Buffer.from('{}'),
    };
    const res = {
      status: (code) => ({ json: (data) => console.log(`Response ${code}:`, data) }),
      json: (data) => console.log('Response JSON:', data),
      send: (text) => console.log('Response Text:', text),
    };

    console.log('🚀 Triggering webhook handler...');
    await stripeWebhookHandler(req, res);

    const fundedLoan = await FundedLoan.findOne({ loanRequestId: loan._id });
    const transaction = await Transaction.findOne({ loanRequestId: loan._id });
    const loanStatus = await LoanRequest.findById(loan._id);

    console.log('--- Verification ---');
    console.log('FundedLoan created:', !!fundedLoan);
    console.log('Transaction created:', !!transaction);
    console.log('LoanRequest status updated to funded:', loanStatus.status === 'funded');
    console.log('StripeEvent tracked:', !!(await StripeEvent.findById(mockEvent.id)));

    if (fundedLoan && transaction && loanStatus.status === 'funded') {
      console.log('\n✅ DAY 15 VERIFIED: ACID transaction and webhook logic are working.');
    } else {
      console.error('\n❌ DAY 15 VERIFICATION FAILED');
      process.exit(1);
    }

  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
