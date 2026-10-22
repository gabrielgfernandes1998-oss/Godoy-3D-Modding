# Estado da versão 0.2.1 beta

A versão 0.2.0 apresentou uma falha de inicialização desktop (tela vazia), reproduzida no Electron com `ERR_BLOCKED_BY_CLIENT`. A verificação anterior no navegador HTTP não detectava esse problema. A versão 0.2.1 serve assets diretamente do ASAR e adiciona testes do runtime desktop e um gate de Windows no workflow de publicação.

Os testes desktop verificam protocolo, sandbox, abas, pintura 3D, exportação YTD/ZIP e biblioteca de ped por gênero. O workflow retém screenshot e resultado Windows. A validação local usa Electron Linux com renderização por software; a Release só é publicada se o teste do executável Windows passar. O teste de navegador também verifica que o ped não entra no GLB e que é restaurado da biblioteca após recarregar.

A análise do grzyClothTool está em [grzyClothTool-reference.md](grzyClothTool-reference.md).

Validação confirmada da 0.2.1: 37 testes JS e 7 Python passaram localmente, assim como o teste de navegador e o teste do ASAR no runtime Electron Linux. O teste do executável Windows e a publicação passaram no [run 39874849585](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39874849585). Isso não equivale a testar recursos em um servidor FiveM.

## Histórico da validação 0.2.0

## Validado neste ambiente Linux

- Node.js 24.19.0; dependências fixadas no package-lock.json.
- 35 testes JavaScript de codecs, pixels, UV, câmera, associação, YMT, pack e união de malhas (37 na 0.2.1, com os testes de assets desktop).
- 7 testes da CLI Python legada.
- Build Vite das quatro entradas.
- Navegador Chromium: importação de conjunto/associação automática, pintura 3D em roupa YDD e veículo YFT, YTD exportado e reaberto com pixels modificados; ZIP FiveM; união OBJ, GLB exportado e reaberto.
- Leitura independente do YMT gerado com CodeWalker.Core, commit 485d56bec00262ed7fa472261cce7bbc6202b96e: dois componentes e três variantes de textura, conversão XML bem-sucedida. Ferramenta temporária, não incluída no pacote.

Os testes usam triângulos/texturas sintéticos originais dos projetos, sem conteúdo GTA distribuído. Eles não demonstram execução dos recursos em FiveM.

## Pendências reais

- Teste em computadores Windows dos usuários com GPU/driver real (o CI usa renderização por software).
- Validação dos packs gerados em servidor FiveM Legacy, com assets reais autorizados de ambos os gêneros.
- Rigging/pesos e compilação de novas geometrias em YDD/YFT.
- Reconstrução e edição completas de skeleton/bones, fragment physics, damage e LOD alto de veículos.
- Inserção de novas entradas dentro de um dicionário YTD; o editor atual altera as texturas existentes. Novas variantes podem ser incluídas como arquivos YTD separados no pack.
- UV atlas automático, transferência de pesos, props, variantes de primeira pessoa e suporte Enhanced/Gen9.

Essas funções não são anunciadas como prontas no aplicativo. A versão portable é uma beta funcional dos recursos da tabela do README, não a conclusão integral da especificação original.
