import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveTextFormatting } from './textFormattingApi';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),getSession:vi.fn()}));
vi.mock('../../lib/supabase',()=>({getSupabaseClient:()=>({rpc:mocks.rpc,auth:{getSession:mocks.getSession}})}));
beforeEach(()=>{mocks.rpc.mockReset().mockResolvedValue({error:null});mocks.getSession.mockReset().mockResolvedValue({data:{session:{user:{id:'owner'}}},error:null});});
describe('text formatting API',()=>{
 it('sends expected text and normalized relative formats in an RPC body',async()=>{
  await saveTextFormatting('owner','note','note-id','before','after',[{start:0,end:2,bold:true,fontSizeOffset:2}]);
  expect(mocks.rpc).toHaveBeenCalledWith('save_text_formatting',{target_kind:'note',target_id:'note-id',expected_text:'before',requested_text:'after',requested_formats:[{start:0,end:2,bold:true,fontSizeOffset:2}]});
 });
 it('rejects an account change before writing',async()=>{
  mocks.getSession.mockResolvedValue({data:{session:{user:{id:'other'}}},error:null});
  await expect(saveTextFormatting('owner','memo','book-id','before','after',[])).rejects.toThrow('Active user changed');expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('propagates stale-content failures for rollback and draft recovery',async()=>{
  const error={code:'40001',message:'Text changed'};mocks.rpc.mockResolvedValue({error});
  await expect(saveTextFormatting('owner','citation','quote-id','quote','quote',[])).rejects.toEqual(error);
 });
});
