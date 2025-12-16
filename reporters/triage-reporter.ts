// reporters/triage-reporter.ts
// Custom Playwright reporter that generates logs in format expected by triage agent

import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

class TriageReporter implements Reporter {
  private failuresDir = 'test-failures';
  private failureCount = 0;

  onBegin() {
    // Ensure directory exists
    if (!fs.existsSync(this.failuresDir)) {
      fs.mkdirSync(this.failuresDir, { recursive: true });
    }
    console.log('\n🤖 Triage Reporter: Monitoring test failures...\n');
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status === 'failed' || result.status === 'timedOut') {
      this.failureCount++;
      this.generateFailureLog(test, result);
    }
  }

  onEnd(result: FullResult) {
    if (this.failureCount > 0) {
      console.log(`\n📋 Generated ${this.failureCount} failure log(s) in ${this.failuresDir}/`);
      console.log('💡 These logs are ready for AI triage analysis\n');
    }
  }

  private generateFailureLog(test: TestCase, result: TestResult) {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const testName = this.sanitizeTestName(test.title);
    const fileName = `${testName}.log`;
    const filePath = path.join(this.failuresDir, fileName);

    let logContent = '';

    // Header
    logContent += `[${timestamp}] INFO: Starting test: ${testName}\n`;
    logContent += `[${timestamp}] INFO: Test file: ${test.location.file}\n`;
    logContent += `[${timestamp}] INFO: Browser: ${test.parent.project()?.name || 'unknown'}\n`;
    logContent += `\n`;

    // Capture test steps
    if (result.steps && result.steps.length > 0) {
      result.steps.forEach(step => {
        const stepTime = new Date(step.startTime).toISOString().replace('T', ' ').substring(0, 19);
        logContent += `[${stepTime}] INFO: ${step.title}\n`;
        
        if (step.error) {
          logContent += `[${stepTime}] ERROR: ${step.error.message}\n`;
          if (step.error.stack) {
            logContent += `[${stepTime}] ERROR: ${step.error.stack}\n`;
          }
        }
      });
      logContent += `\n`;
    }

    // Error details
    if (result.error) {
      const errorTime = new Date(result.startTime.getTime() + result.duration).toISOString().replace('T', ' ').substring(0, 19);
      
      // Classify error type
      const errorType = this.classifyError(result.error.message || '');
      
      logContent += `[${errorTime}] ERROR: ${errorType}: ${result.error.message}\n`;
      
      if (result.error.stack) {
        const stackLines = result.error.stack.split('\n').slice(0, 5);
        stackLines.forEach(line => {
          logContent += `[${errorTime}] ERROR: ${line.trim()}\n`;
        });
      }
      logContent += `\n`;
    }

    // Retry information
    if (result.retry > 0) {
      logContent += `[${timestamp}] INFO: Retry attempt ${result.retry}\n`;
    }

    // Duration and status
    const duration = (result.duration / 1000).toFixed(1);
    const statusTime = new Date(result.startTime.getTime() + result.duration).toISOString().replace('T', ' ').substring(0, 19);
    
    if (result.status === 'timedOut') {
      logContent += `[${statusTime}] ERROR: Test timed out after ${duration}s\n`;
    }
    
    logContent += `[${statusTime}] FAIL: ${testName} - FAILED after ${duration}s\n`;

    // Attachments info
    if (result.attachments && result.attachments.length > 0) {
      result.attachments.forEach(attachment => {
        logContent += `[${statusTime}] INFO: Attachment saved: ${attachment.name}\n`;
      });
    }

    // Write log file
    fs.writeFileSync(filePath, logContent);
  }

  private classifyError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TimeoutError';
    }
    if (message.includes('selector') || message.includes('locator') || message.includes('element')) {
      return 'SelectorError';
    }
    if (message.includes('network') || message.includes('fetch') || message.includes('request failed')) {
      return 'NetworkError';
    }
    if (message.includes('expect') || message.includes('assertion')) {
      return 'AssertionError';
    }
    
    return 'Error';
  }

  private sanitizeTestName(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100);
  }
}

export default TriageReporter;