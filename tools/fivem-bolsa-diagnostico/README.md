# Diagnóstico de bolsa no FiveM

[Baixar ZIP pronto](https://raw.githubusercontent.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/main/tools/downloads/Godoy-Teste-Bolsa-FiveM.zip).

Recurso temporário independente do aplicativo. Extraia a pasta `godoy_bolsa_diagnostico` em `resources`, mantenha o pack iniciado e execute `ensure godoy_bolsa_diagnostico` no console do servidor. Feche a loja e execute `godoy_bolsa` no F8 com o ped masculino. O padrão é a coleção `mp_m_freemode_01_mochi`, componente `hand` (5), índice local 0 e textura 0. O comando aceita outra coleção, índice e textura como argumentos.

O log registra contagem e limites de índices globais, seleção atual, presença da coleção, quantidade de bolsas/texturas, índice global correspondente e validade da combinação. Só aplica combinações reconhecidas pelas natives de coleção. Depois de 1,5 s, consulta novamente para detectar se a seleção mudou. A seleção correta permanecer aplicada não comprova que a geometria renderizou: é necessário conferir a aparência no jogo. O teste não determina sozinho qual script mudou uma seleção nem a causa de uma malha invisível.

`godoy_bolsa_restaurar` restaura a seleção guardada do mesmo ped/modelo, inclusive a coleção base. Testes repetidos preservam o primeiro backup. Não há gravação no servidor/banco, alteração de arquivos ou troca automática de peças ao iniciar. Depois do teste, execute `stop godoy_bolsa_diagnostico` e remova a pasta se desejar.

Validação local: `texlua tools/fivem-bolsa-diagnostico/test.lua` verifica rejeição de coleção/variação/índice inválidos e ausência de natives, aplicação direta, limite global count-1, detecção de troca de seleção, backup e restauração, troca de ped e cancelamento da consulta pendente. O teste usa natives simuladas; não executa FiveM.

O ZIP contém somente `fxmanifest.lua`, `client.lua` e `LEIA-ME.txt`, sem modelos, texturas ou metadados do usuário. Nenhuma correção de YDD é aplicada por este diagnóstico.
