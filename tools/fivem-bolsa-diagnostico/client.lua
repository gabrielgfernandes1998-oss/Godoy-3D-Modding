-- Executado somente por comando. Nao altera inventario, banco de dados ou o pack.
local component = 5 -- hand: bolsas / paraquedas
local backup
local sequence = 0

local function log(message)
    print('[Godoy bolsa] ' .. message)
end

local function ready()
    local required = {
        'GetPedCollectionsCount', 'GetPedCollectionName',
        'GetNumberOfPedCollectionDrawableVariations',
        'GetNumberOfPedCollectionTextureVariations',
        'GetPedDrawableGlobalIndexFromCollection',
        'IsPedCollectionComponentVariationValid',
        'SetPedCollectionComponentVariation',
        'GetPedDrawableVariationCollectionName',
        'GetPedDrawableVariationCollectionLocalIndex'
    }
    for _, name in ipairs(required) do
        if type(_G[name]) ~= 'function' then
            log('Native indisponivel: ' .. name .. '. Confira a versao do servidor FiveM.')
            return false
        end
    end
    return true
end

local function current(ped, label)
    log(('%s: global=%d, colecao=%s, local=%d, textura=%d'):format(
        label, GetPedDrawableVariation(ped, component),
        GetPedDrawableVariationCollectionName(ped, component) or '(nenhuma)',
        GetPedDrawableVariationCollectionLocalIndex(ped, component),
        GetPedTextureVariation(ped, component)))
end

RegisterCommand('godoy_bolsa', function(_, args)
    if not ready() then return end
    local ped = PlayerPedId()
    local model = GetEntityModel(ped)
    if model ~= joaat('mp_m_freemode_01') and model ~= joaat('mp_f_freemode_01') then
        log('Use o personagem freemode masculino ou feminino antes deste teste.')
        return
    end
    local requested = args[1] or 'mp_m_freemode_01_mochi'
    local index, texture = tonumber(args[2] or '0'), tonumber(args[3] or '0')
    if not index or index % 1 ~= 0 or index < 0 or not texture or texture % 1 ~= 0 or texture < 0 then
        log('Uso: godoy_bolsa [colecao] [indice local inteiro >= 0] [textura inteira >= 0]')
        return
    end
    sequence = sequence + 1
    local run = sequence
    local count = GetNumberOfPedDrawableVariations(ped, component)
    log(('Componente hand / 5: %d bolsas; indices globais validos de 0 a %d.'):format(count, count - 1))
    current(ped, 'Antes')
    local collection
    for i = 0, GetPedCollectionsCount(ped) - 1 do
        local name = GetPedCollectionName(ped, i)
        if name == requested then collection = name; break end
    end
    if not collection then
        log('Colecao AUSENTE neste personagem: ' .. requested .. '. Verifique carregamento do recurso, YMT, nomes e genero.')
        return
    end
    local drawables = GetNumberOfPedCollectionDrawableVariations(ped, component, collection)
    log(('Colecao %s ENCONTRADA: %d bolsa(s).'):format(collection, drawables))
    if index >= drawables then
        log('Indice local ausente nesta colecao. Nenhuma roupa alterada.')
        return
    end
    local textures = GetNumberOfPedCollectionTextureVariations(ped, component, collection, index)
    local global = GetPedDrawableGlobalIndexFromCollection(ped, component, collection, index)
    local valid = IsPedCollectionComponentVariationValid(ped, component, collection, index, texture)
    log(('Alvo: local=%d, global=%d, texturas=%d, variacao valida=%s'):format(index, global, textures, tostring(valid)))
    if global < 0 or texture >= textures or not valid then
        log('O jogo nao reconheceu essa variacao. Nenhuma roupa alterada.')
        return
    end
    if not backup or backup.ped ~= ped or backup.model ~= model then
        backup = {ped=ped, model=model,
            collection=GetPedDrawableVariationCollectionName(ped, component),
            index=GetPedDrawableVariationCollectionLocalIndex(ped, component),
            texture=GetPedTextureVariation(ped, component), palette=GetPedPaletteVariation(ped, component)}
    end
    SetPedCollectionComponentVariation(ped, component, collection, index, texture, 0)
    log('Bolsa aplicada diretamente. Feche a loja e confira o personagem. Use godoy_bolsa_restaurar para voltar.')
    CreateThread(function()
        Wait(1500)
        if run ~= sequence or PlayerPedId() ~= ped or GetEntityModel(ped) ~= model then return end
        current(ped, 'Depois de 1,5 s')
        if GetPedDrawableVariationCollectionName(ped, component) ~= collection or
           GetPedDrawableVariationCollectionLocalIndex(ped, component) ~= index or
           GetPedTextureVariation(ped, component) ~= texture then
            log('A selecao mudou depois de aplicar. Confira se a loja/outro script esta reaplicando as roupas.')
        else
            log('A selecao permaneceu no alvo. Se a bolsa continuar invisivel, envie este log e o YDD FINAL do stream para verificar a malha/streaming.')
        end
    end)
end, false)

RegisterCommand('godoy_bolsa_restaurar', function()
    if not ready() then return end
    sequence = sequence + 1
    if not backup then log('Nenhuma bolsa anterior guardada nesta sessao.'); return end
    local ped = PlayerPedId()
    if ped ~= backup.ped or GetEntityModel(ped) ~= backup.model then
        log('O personagem mudou. A roupa anterior nao foi aplicada neste novo personagem.')
        backup = nil
        return
    end
    if backup.collection == nil or backup.index < 0 then
        log('A selecao anterior nao tinha uma colecao valida. Restaure pela loja.')
        return
    end
    SetPedCollectionComponentVariation(ped, component, backup.collection, backup.index, backup.texture, backup.palette)
    backup = nil
    log('Bolsa anterior restaurada.')
end, false)
