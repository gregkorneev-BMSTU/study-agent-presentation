import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const server=spawn('npm',['run','present','--','--port','4173'],{stdio:'ignore'});
try {
 await new Promise(r=>setTimeout(r,1500));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 await page.goto('http://127.0.0.1:4173/?print-pdf',{waitUntil:'networkidle'});
 await page.waitForTimeout(1500);
 await page.pdf({path:'study-agent-presentation.pdf',width:'1920px',height:'1080px',printBackground:true,preferCSSPageSize:true});
 await browser.close();
} finally {server.kill();}
