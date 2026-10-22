# Estado da versão 0.2.0 beta

## Validado neste ambiente Linux

- Node.js 24.19.0; dependências fixadas no package-lock.json.
- 35 testes JavaScript de codecs, pixels, UV, câmera, associação, YMT, pack e união de malhas.
- 7 testes da CLI Python legada.
- Build Vite das quatro entradas.
- Navegador Chromium: importação de conjunto/associação automática, pintura 3D em roupa YDD e veículo YFT, YTD exportado e reaberto com pixels modificados; ZIP FiveM; união OBJ, GLB exportado e reaberto.
- Leitura independente do YMT gerado com CodeWalker.Core, commit 485d56bec00262ed7fa472261cce7bbc6202b96e: dois componentes e três variantes de textura, conversão XML bem-sucedida. Ferramenta temporária, não incluída no pacote.

Os testes usam triângulos/texturas sintéticos originais dos projetos, sem conteúdo GTA distribuído. Eles não demonstram execução dos recursos em FiveM.

## Pendências reais

- Execução do portable em Windows 10/11 x64 e teste com GPU/driver real.
- Validação dos packs gerados em servidor FiveM Legacy, com assets reais autorizados de ambos os gêneros.
- Rigging/pesos e compilação de novas geometrias em YDD/YFT.
- Reconstrução e edição completas de skeleton/bones, fragment physics, damage e LOD alto de veículos.
- Inserção de novas entradas dentro de um dicionário YTD; o editor atual altera as texturas existentes. Novas variantes podem ser incluídas como arquivos YTD separados no pack.
- UV atlas automático, transferência de pesos, props, variantes de primeira pessoa e suporte Enhanced/Gen9.

Essas funções não são anunciadas como prontas no aplicativo. A versão portable é uma beta funcional dos recursos da tabela do README, não a conclusão integral da especificação original.
