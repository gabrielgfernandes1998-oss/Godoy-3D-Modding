-- Run from the repository root: texlua tools/fivem-bolsa-diagnostico/test.lua
local commands, messages, threads, mutations = {}, {}, {}, {}
local present, drawables, textures, valid = true, 1, 1, true
local ped, model = 1, 123
local selected = {collection='', index=4, texture=2, palette=1}
local function copy(v) return {collection=v.collection,index=v.index,texture=v.texture,palette=v.palette} end
function print(text) messages[#messages+1] = text end
function RegisterCommand(name, callback) commands[name] = callback end
function PlayerPedId() return ped end
function GetEntityModel() return model end
function joaat(name) return name == 'mp_m_freemode_01' and 123 or 456 end
function GetPedCollectionsCount() return present and 2 or 1 end
function GetPedCollectionName(_, i) return i == 0 and '' or 'mp_m_freemode_01_mochi' end
function GetNumberOfPedCollectionDrawableVariations() return drawables end
function GetNumberOfPedCollectionTextureVariations() return textures end
function GetPedDrawableGlobalIndexFromCollection() return 113 end
function IsPedCollectionComponentVariationValid() return valid end
function GetNumberOfPedDrawableVariations() return 114 end
function GetPedDrawableVariation() return selected.collection == '' and selected.index or 113 end
function GetPedDrawableVariationCollectionName() return selected.collection end
function GetPedDrawableVariationCollectionLocalIndex() return selected.index end
function GetPedTextureVariation() return selected.texture end
function GetPedPaletteVariation() return selected.palette end
function SetPedCollectionComponentVariation(_, slot, collection, index, texture, palette)
    assert(slot == 5)
    selected = {collection=collection,index=index,texture=texture,palette=palette}
    mutations[#mutations+1] = copy(selected)
end
function CreateThread(fn) threads[#threads+1] = fn end
function Wait(ms) assert(ms == 1500) end
local function contains(text)
    for _, line in ipairs(messages) do if line:find(text, 1, true) then return true end end
    return false
end
local function run(args) commands.godoy_bolsa(0, args or {}) end
local function drain() local queue=threads; threads={}; for _, fn in ipairs(queue) do fn() end end
dofile('tools/fivem-bolsa-diagnostico/client.lua')
assert(#mutations == 0, 'loading the resource must not change clothes')
present=false; run(); assert(#mutations == 0 and contains('AUSENTE'))
present=true; drawables=0; run(); assert(#mutations == 0)
drawables=1; textures=0; run(); assert(#mutations == 0)
textures=1; valid=false; run(); assert(#mutations == 0)
valid=true; run({'mp_m_freemode_01_mochi','-1'}); run({'mp_m_freemode_01_mochi','0.5'}); assert(#mutations == 0)
model=999; run(); assert(#mutations == 0)
model=123
local native=SetPedCollectionComponentVariation; SetPedCollectionComponentVariation=nil
run(); assert(#mutations == 0 and contains('Native indisponivel'))
SetPedCollectionComponentVariation=native
run(); drain()
assert(#mutations == 1 and selected.collection == 'mp_m_freemode_01_mochi' and selected.index == 0)
assert(contains('indices globais validos de 0 a 113') and contains('global=113'))
assert(contains('A selecao permaneceu no alvo'))
run(); drain(); commands.godoy_bolsa_restaurar()
assert(selected.collection == '' and selected.index == 4 and selected.texture == 2 and selected.palette == 1,
       'repeated tests must retain the original selection, including base collection')
run(); selected={collection='',index=3,texture=0,palette=0}; drain()
assert(contains('A selecao mudou depois de aplicar'))
local before=#mutations; ped=2; commands.godoy_bolsa_restaurar(); assert(#mutations == before)
ped=1; run(); local count=#messages; commands.godoy_bolsa_restaurar(); drain()
assert(#messages == count+1, 'restoring cancels pending post-check')
io.write('PASS: registration/index validation, no changes on rejected targets, collection application, delayed override detection, backup/restore, changed ped, cancellation\n')
