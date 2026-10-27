import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {unzipSync} from 'fflate';
import {assertFiveMBudget} from '../src/resource-budget.js';
export async function exerciseCompactor(page,output){
 await page.locator('[data-tab=converter]').click();const frame=page.frameLocator('#converter iframe');
 await frame.locator('#ydd-compactor summary').click();
 console.log('YDD compactor: uploading duplicate-LOD fixture');
 const pending=page.waitForEvent('download',{timeout:240000});
 await frame.locator('#compact-ydd-file').setInputFiles('tests/fixtures/native-duplicate-lods.ydd',{timeout:120000});
 console.log('YDD compactor: upload complete; awaiting first ZIP');
 const download=await pending,target=path.join(output,'compact-ydd.zip');await download.saveAs(target);
 const files=unzipSync(await readFile(target)),report=JSON.parse(new TextDecoder().decode(files['relatorio-ydd.json']));
 assert.ok(files['native-duplicate-lods.ydd']);assert.equal(Object.keys(files).length,2,'does not replace YTD');
 assert.ok(report.beforeSystem>100000000);assert.ok(report.afterSystem<100000000);assert.ok(report.afterBytes<report.beforeBytes*.7);
 assertFiveMBudget(files['native-duplicate-lods.ydd'],'compacted.ydd');
 await frame.locator('#compact-ydd-result').filter({hasText:'Use o YTD original'}).waitFor();
 console.log('YDD compactor: uploading already-shared fragmented fixture');
 const next=page.waitForEvent('download',{timeout:240000});await frame.locator('#compact-ydd-file').setInputFiles('tests/fixtures/native-fragmented-shared-lods.ydd',{timeout:120000});
 const fixed=await next,fixedTarget=path.join(output,'compact-fragmented-ydd.zip');await fixed.saveAs(fixedTarget);
 const fixedFiles=unzipSync(await readFile(fixedTarget)),fixedReport=JSON.parse(new TextDecoder().decode(fixedFiles['relatorio-ydd.json']));
 assert.ok(fixedReport.beforeSystem>100000000);assert.ok(fixedReport.afterSystem<100000000);assertFiveMBudget(fixedFiles['native-fragmented-shared-lods.ydd'],'fixed.ydd');
 assert.equal(Object.keys(fixedFiles).length,2,'page layout optimization leaves the original YTD alone');
 console.log('YDD compactor: both real native ZIPs and resource budgets verified');
}
