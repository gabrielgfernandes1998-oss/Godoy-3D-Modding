# Estado da versão 0.5.2 beta

Corrige os dois erros reportados em uso real: “Esqueleto de ped inválido” ao carregar pelo CodeWalker e “Material YDD sem DiffuseSampler compatível” na exportação do OBJ. O buffer Uint8Array vindo da janela principal é validado por sua marca de view e copiado para o contexto local antes do IndexedDB; a verificação antiga por instanceof rejeitava buffers de outro contexto. A identificação dos samplers agora usa os hashes JOAAT canônicos em minúsculas do GTA, mantendo suporte aos hashes mistos produzidos nas fixtures antigas. Os fixtures foram corrigidos para usar o hash GTA `4059966321` de diffusesampler.

Validação no [run 39980396697](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39980396697): 53 testes JavaScript, suíte nativa .NET e 7 testes Python passaram. Há regressões para Uint8Array de outro contexto com byteOffset, entradas inválidas, diffuse/bump/spec canônicos e diffuse legado. O navegador local simulou bytes da janela principal e carregou o ped pelo botão. O executável Windows empacotado recebeu um ped sintético pela IPC real do Electron, carregou e guardou o esqueleto, depois exportou o OBJ incorporado usando material com hash canônico e verificou a pintura independente no YTD. O teste usa fixtures originais; a extração de uma instalação GTA real e a aparência/animação no FiveM continuam dependentes de validação no computador do usuário.

[Release 0.5.2](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.5.2) publicada, baixada e checksum conferido: 200,601,299 bytes; SHA-256 `ae6ae06f3335d981d269d2767576533b5fe0b222f9277257052ee5ba89f4aab1`.

# Histórico da versão 0.5.1 beta

OBJ incorporado pode receber UV automático sem sobreposição entre faces e textura diffuse própria no YTD original. A exportação com OBJ exige associar o YTD e baixa um ZIP com o par YDD/YTD e guias UV PNG. O material adicional usa a nova textura em todos os LODs, preservando as referências, UVs e pixels da roupa. A pintura mostra as arestas UV da textura selecionada.

Validação no [run 39973640482](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39973640482): 51 testes JS, 7 Python e suíte nativa .NET passaram. O executável Windows empacotado importou a roupa, incorporou OBJ, desfez/refez, associou YTD, exportou o ZIP e reabriu ambos os arquivos; verificou as geometrias e o novo sampler nos LODs. Depois selecionou a textura OBJ em Pintura de roupas, pintou no UV, exportou YTD e conferiu que os pixels do OBJ mudaram enquanto os da roupa permaneceram iguais. O navegador local também verificou o botão de associação do YTD, além das regressões de pack, pintura, cena e histórico. A suíte nativa verifica mipmaps completos, nomes/samplers e preservação dos bytes das texturas originais.

[Release 0.5.1](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.5.1) publicada, baixada e checksum conferido: 200,600,164 bytes; SHA-256 `c5ae3c9901b69391746cf576f61617f18bbe549532f7302afef574f622307169`.

O teste Windows da 0.5.0 bloqueou sua publicação ao detectar que o botão YTD perdia o evento de seleção. A 0.5.1 corrige o encaminhamento do evento e inclui a regressão no navegador.

Limites: UV inicial com ilhas triangulares e textura cinza; sem unwrap artístico, MTL/imagens do OBJ, solda booleana, decimação de LOD ou edição de colisão. Até 21845 triângulos por parte após separação das costuras, 100000 vértices no total, 32 partes e 10 MB. Exige shader com DiffuseSampler compatível. A aparência e animação com assets reais no FiveM ainda precisam ser verificadas no jogo.

# Histórico da versão 0.4.0 beta

A união OBJ + YDD tem seletores explícitos de destino e origem. O objeto incorporado vira filho da peça, preservando a posição e a escala inclusive com destino não uniformemente escalado; desfazer/refazer restaura a organização anterior. A exportação grava geometria adicional no YDD original em todos os LODs existentes, preservando os canais originais e herdando material, palette de ossos e pesos da região mais próxima. UV ausente recebe projeção planar.

Validação: 50 testes JS, 7 Python e suíte .NET nativa passaram no [run 39969336248](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39969336248). A suíte nativa verifica geometrias adicionadas nos LODs, bytes originais, pesos, índices, UV, posição, transformação conjunta, vínculo rígido e vertex stream secundário. O EXE Windows empacotado manteve o OBJ selecionado, escolheu o YDD de destino, uniu, desfez/refez e exportou pelo botão; o arquivo baixado foi reaberto e conferido para presença e posição do OBJ em ambos os LODs da fixture.

Release 0.4.0 baixada e checksum conferido: 200.590.400 bytes; SHA-256 `238621fab01d1477d6835915a004019e992cbe4642e3cd28a7dfff1899f12dca`.

A geometria incorporada usa o material/YTD do destino; não adiciona textura própria/MTL nem atlas, não faz solda booleana e não gera LODs simplificados. A animação e aparência no FiveM com o YDD/YTD real do usuário continuam pendentes de validação.

## Histórico da 0.3.2


Corrige o pivô de manipulação de OBJ/YDD com origem afastada dos vértices. O gizmo usa o centro da geometria visível, enquanto as transformações e a exportação continuam aplicadas ao objeto original. O enquadramento inclui peça e referência; há recuperação manual de peças afastadas e posicionamento de OBJ fora da área de trabalho. O rótulo de versão vem do package.json.

Validação: 48 testes JavaScript, suíte nativa e 7 Python passaram no [run 39959692921](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39959692921). O navegador e o executável Windows empacotado importaram OBJ com coordenadas próximas a (1000, -370, -473), arrastaram seu gizmo com o mouse mantendo pixels do YDD/ped visíveis, enquadraram peça/referência e verificaram Ctrl+Z do movimento e do reposicionamento. O teste Windows também mantém a exportação YDD e a verificação de vértices/LODs.

Release 0.3.2 baixada após publicação e checksum conferido: 200.580.415 bytes; SHA-256 `c77c445085ceb6e8a8c1a5767a761816a1c10728001dbe554495f1af17ffad37`.

## Histórico da 0.3.1


O portable inclui o núcleo CodeWalker e o exportador nativo da peça YDD, com seleção unificada e vínculo rígido opcional ao ped. A exportação mantém o YTD original e verifica a reabertura do YDD.

Validação: 45 testes JavaScript, 7 Python e suíte .NET nativa passaram. A suíte nativa usa triângulos/esqueleto originais sintéticos, verifica posição/rotação/escala, normais, UV, pesos preservados, vínculo à pelve, coordenadas locais de peças rígidas, esqueleto doador e preservação dos LODs quando falta nível intermediário. O comando real do helper foi executado e o resultado lido pelo parser do renderer.

O [run Windows 39954038588](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39954038588) passou: inicia o EXE empacotado, carrega o núcleo incluído, verifica Ctrl+Z/Ctrl+Y do vínculo, altera a posição no editor, exporta pelo botão YDD, baixa e reabre o arquivo, conferindo vértices e LODs. A primeira tentativa 0.3.0 não foi publicada; o teste precisava aguardar o comando encaminhado ao iframe antes de consultar o seletor.

Download da release 0.3.1 conferido após publicação: 200.579.338 bytes; SHA-256 `b694fabb11189adfa6d9eee44db1ef1aef895a7a257c0dbc48dafc20099dfc19`.

Ainda não há teste de animação no FiveM nem leitura de ped de uma instalação GTA real neste ambiente. O exportador não converte registro/META/YMT de prop de cabeça em roupa de cintura, não incorpora OBJ em YDD, não exporta YFT e recusa layouts de vértice/buffers/colisões incompatíveis. Para validar o caso real do boné é necessário seu YDD/YTD e conferir o componente em que está registrado.

## Histórico da 0.2.3


A versão adiciona a correção de câmera ao importar OBJ, histórico de cena e ponte CodeWalker local. Testes de regressão verificam pixels do modelo/ped ainda visíveis após importar um OBJ distante, desfazer/refazer a importação, transformar, desfazer/refazer a transformação e desfazer/refazer a união. A versão usa a biblioteca CodeWalker externa, selecionada pelo usuário; não redistribui essa DLL ou dados GTA.

A conexão com CodeWalker.Core e um round-trip de YDD reservado foram testados por execução real da ponte .NET em Linux. O recurso usado para isso é o reservedDrawable.ydd do grzyClothTool, mantido somente em /tmp e não copiado para o projeto/pacote. A extração do ped em x64v.rpf não foi validada numa instalação real GTA, indisponível neste ambiente. O teste Windows verifica que o helper self-contained inicia e reporta a ausência de CodeWalker corretamente; não simula uma instalação GTA como se fosse real.

Validação da 0.2.3: 40 testes JavaScript e 7 Python passaram. O teste do executável Windows, incluindo regressão de câmera/undo e inicialização do helper .NET, passou no [run 39880621937](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39880621937). A tentativa 0.2.2 foi bloqueada pelo teste Windows por um erro de escopo de require no próprio teste; a verificação foi movida para o processo Node de testes. Nenhuma Release 0.2.2 foi publicada.

## Histórico da 0.2.1

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
