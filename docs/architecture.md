# Arquitetura da versão 0.2.1

## Implementado

```text
index.html / src/app.js        shell, navegação e integração dos módulos
src/pack.js                   associação, validação e ZIP FiveM
src/ymt.js                    serializer/leitor CPedVariationInfo RSC7 v2
src/asset-batch.js             seleção de conjunto e associação YDD/YFT–YTD
src/mesh.js                   viewport Three.js, ped, OBJ, gizmos, GLB
src/mesh-core.js               união estática de geometria/UV
modules/clothing/             editor PAINTFIVE integrado, origem fixada
modules/vehicles/             editor Godoy-Paint-Car integrado, origem fixada
electron.cjs                  shell desktop isolado e protocolo godoy://
scripts/portable.mjs          compilação portable Windows x64 e checksum
godoy/clothing/exporter.py     CLI legada para arquivos já preparados
tests/                        testes de binários, pack, malhas e navegador
```

Vite compila quatro entradas. O shell carrega os editores sob demanda em frames locais para preservar seus estados e evitar colisão de estilos/IDs. Os editores compartilham a mesma versão de Three.js/fflate. A base JavaScript dos dois projetos foi mantida para reutilizar os codecs e os editores existentes; React/TypeScript continuam opções para uma migração posterior, sem duplicar toda a implementação.

O portable não depende de um servidor Python/C#. O processamento atual acontece localmente no renderer. Electron usa sandbox, contextIsolation, nodeIntegration desativado, bloqueio de navegação e requisições externas. O renderer recebe arquivos somente pela seleção do usuário; não há IPC genérico para filesystem ou comandos. O protocolo local resolve somente o diretório dist. As fontes remotas dos projetos de origem foram removidas.

Exportar YTD em roupas envia uma cópia do asset atualizado e do YDD para o shell via postMessage. O shell aceita somente mensagens vindas do frame de roupas, da mesma origem, com nomes e tamanhos limitados. Os originais permanecem intactos.

## Coleções de roupas

O gerador suporta um subconjunto explícito: componentes de ped, índices contínuos, drawables _u/_r e texturas uni/whi. Não renumera os assets. Constrói o mapa availComp, arrays de componentes/drawables/texturas, compInfos e dlcName. O recurso RSC7 contém uma página de sistema, tabelas de estruturas, blocos de dados e compressão DEFLATE raw. Os hashes de nomes do schema preservam caixa; o hash de DLC usa nome normalizado minúsculo.

A estrutura binária foi conferida por leitor independente, sem incorporar a biblioteca CodeWalker à distribuição. A validação no jogo ainda precisa de assets autorizados e um servidor FiveM. Gerar um binário decodificável não comprova todos os comportamentos de roupas no jogo.

## Evolução nativa pendente

Para modificar a geometria de YDD/YFT é necessário um adaptador nativo separado. Python/FastAPI pode orquestrar jobs no cloud; C#/.NET ou Blender/Sollumz podem processar a representação intermediária, após selecionar um compilador redistribuível e validar seu suporte de plataforma/licença. Não existe atualmente um backend nativo oculto no portable.

Contrato necessário: representar malhas, LODs, bones, skin weights, materiais, UVs e texturas; preservar campos não editados; compilar os recursos; reabrir e comparar as saídas. OBJ não carrega skinning: unir triângulos não cria os pesos necessários. Para veículos, conservar bounds, colisões, fragmentos, física e damage; _hi.yft não pode ser uma cópia arbitrária do arquivo principal. O editor atual mostra drawables/LODs e geometrias, não uma reconstrução completa da árvore física/bones.

Não foi distribuído o CodeWalker.Core: a distribuição consultada declara uso educacional. Ele foi usado exclusivamente como leitor de verificação temporário fora do repositório. A escolha de um compilador nativo para redistribuição permanece uma decisão técnica a concluir com fixtures reais.
