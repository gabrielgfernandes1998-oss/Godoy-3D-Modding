# Estado da versão 0.11.1 beta

Causa identificada na fonte do grzyClothTool/CodeWalker: Renderer.RenderIsModelFinalRender rejeita modelos com RenderMaskFlags & 1 igual a zero quando proxies estão desativados. ObjYdd criava modelos com máscara padrão zero; a prévia interna não usa esse filtro. Modelos novos agora usam RenderMask 255 e BuildRenderMasks propaga aos LODs. Shader family corrigida de ped_default para ped, mantendo ped_default.sps. Exportação reabre e valida máscaras; testes nativos conferem bit de visibilidade, shader, pesos, UV e samplers. Teste Windows GLB verifica máscaras dos modelos por leitura binária. 80 testes JS e suíte nativa passaram localmente. Não houve teste visual no grzy/FiveM neste ambiente Linux.

# Estado da versão 0.11.0 beta

Texto com flipX/flipY persistidos e renderizados junto à rotação/escala; controles preservam histórico. Pincel procedural determinístico de couro, ripstop e tecido, com cor/escala/intensidade e ancoragem UV. Rasterização respeita suavidade, opacidade, seleção e limites UV. Efeito diffuse, sem relevo físico. Teste em Chromium: espelhamento combinado sem diferenças de alfa em relação à imagem invertida, projeto mantém flags, undo/redo passa; pincel ripstop gerou 458 cores sem nenhum pixel fora do limite. 80 testes JavaScript e navegador completo passaram.

Validação final no [run 40259249779](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40259249779): compilação, 80 testes JS, 7 Python, suíte nativa, packs e executável Windows passaram. No Windows, pincel ripstop respeitou o atlas e o projeto exportado preservou os dois espelhamentos do texto. [Release 0.11.0](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.11.0) publicada. ZIP baixado e SHA-256 conferido: 200776577 bytes; `aa05122221df586f2ddfa902897eb844d5c0df36063a5395b4ba38bf3c5c4454`.

# Estado da versão 0.10.0 beta

Importação GLB em worker, leitura de cores e imagens embutidas PNG/JPEG/WebP, transformação de UV e atlas com áreas independentes por componente físico. Reconecta duplicatas posicionais para reconhecer peças sem confundir costuras UV/normais. Cores uniformes ganham ilhas novas; imagens mantêm UVs por componente, com modo opcional de isolamento por triângulo. Pintura 3D é limitada à região UV da geometria atingida; mapa 2D permanece livre.

Teste local privado com GLB enviado pelo usuário: 5 materiais/5 imagens embutidas, 97 componentes/áreas, 116 geometrias internas, 491742 triângulos e 457724 vértices armazenados após compactação. Atlas 4096 preservou a densidade das imagens de base. Comando CodeWalker real gerou YDD de 19573865 bytes e YTD de 8541057 bytes, reabertos pelos parsers. O teste usou adaptador HTTP privado para a ponte .NET local e ped sintético, sem publicar o GLB/texturas. O portable usa IPC/arquivos temporários.

Reabertura na pintura: pincel 3D de 180 px sobre a argola mudou 25408 pixels de uma única área; zero alterações nas outras 96 ou fora da área. Todos os triângulos foram preservados. Normal/roughness/metalness e reflexos PBR não são exportados; UVs compartilhados dentro de componente texturizado exigem o modo de isolamento, com possível redução de detalhe. Aparência/animação no FiveM não foi validada.

Regressões incluem atlas sem sobreposição entre peças, cor linear/sRGB, orientação de imagem, costuras, componentes conectados, seleção de resolução, retorno entre modos, PNG/WebP/fator sem imagem e reabertura/edição do YDD/YTD. Arquivos de teste versionados são sintéticos; o arquivo enviado não está no GitHub.

Validação final no [run 40255498318](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40255498318): 79 testes JavaScript, 7 Python, suíte nativa, fluxo de packs e executável Windows passaram. O teste Windows converteu o GLB sintético com PNG/WebP/cores, reabriu o YDD/YTD e confirmou pintura restrita à área atingida. [Release 0.10.0](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.10.0) publicada; ZIP baixado e SHA-256 conferido: 200775424 bytes; `dd5f50036228b7eb4c1540c6117b7cdd6f5ed72dd8cecc23bf1badb8ab934871`.

# Estado da versão 0.9.3 beta

Módulo 05 sem tetos fixos de 20 MB/500 mil vértices/32 partes/32 MB JSON. Importação e preparo em workers com cancelamento; arrays tipados e arquivo temporário binário substituem JSON da geometria. Vértices exatamente iguais em posição/normal/UV são reutilizados, sem remover faces nem unir costuras com atributos diferentes. Prévia UV é amostrada para navegação; guia exportado completo em SVG acima de 100 mil faces, PNG nos demais casos. Textura continua PNG/YTD. Permanecem contadores/endereço do formato, memória disponível e orçamento de leitura de 256 MB RSC7.

Testes locais com os dois arquivos enviados pelo usuário (mantidos privados, fora do repositório): chaveiro de 48.202.369 bytes, 491.620 triângulos/1.474.860 cantos, convertido em 23 geometrias/280.658 vértices armazenados/17.769.517 bytes YDD; iPhone de 13.648.464 bytes, 237.271 triângulos/711.813 cantos, convertido em 50 geometrias/711.813 vértices/11.238.053 bytes YDD. Todos os triângulos reabertos foram contados, sem remoção. Conversão usou o comando nativo real e um ped sintético de referência. O teste local usou um adaptador HTTP privado para a ponte .NET; o portable usa IPC/arquivos temporários. Aparência/animação no FiveM não foi validada. O chaveiro não inclui imagens; não há reconstrução automática dos materiais MTL do iPhone.

Validação local: 74 testes JS, suíte nativa, navegador completo e fluxo de packs passaram. Regressões de cancelamento/reimportação, OBJ acima de 20 MB e 600 mil vértices, preservação das faces, SVG completo, transporte binário, mais de 32 geometrias, rejeição de dados truncados e compactação respeitando costuras de UV/normais. Nenhum arquivo real ou imagem enviada foi incluído no GitHub/portable.

O candidato 0.9.2 não foi publicado: o [run 40248721450](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40248721450) passou compilação/testes, mas a automação excedeu 20 segundos ao injetar o arquivo grande como Buffer pelo protocolo do Playwright. A regressão agora grava o OBJ no disco e o seleciona por caminho, como o seletor real, com prazo específico para operações grandes. A publicação continua dependente do teste Windows completo.

Validação final no [run 40249480975](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40249480975): 74 testes JavaScript, 7 Python, suíte nativa, fluxo de packs e executável Windows passaram. O portable selecionou o OBJ maior que 20 MB pelo disco, cancelou/reimportou, processou 600000 vértices em workers e pela ponte binária, conferiu os 200000 triângulos em todos os LODs e o guia SVG completo. A interface continuou sem remover a cena anterior ao cancelar.

[Release 0.9.3](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.9.3) publicada; ZIP baixado e SHA-256 conferido: 200,742,428 bytes; `39b5588eb1b96174f7b88bfe9469b8b4feea730796cb1eb0f6db804cc19d9f38`.

# Estado da versão 0.9.1 beta

O conversor divide automaticamente malhas OBJ acima de 65535 vértices em geometrias com índices de 16 bits, mantendo triângulos completos, atributos e transformações. O objeto continua um único item na cena. O total permitido passa a 500000 vértices triangulados/32 partes/32 MB serializados somente para o módulo 05; os limites da incorporação do módulo 03 permanecem.

Validação: teste JS divide 120006 vértices, confere posições/normais/UVs exatos, transformações de pai/filho e restauração de UV original; UV automático continua através das partes. Excesso de orçamento é rejeitado antes de mutar a cena. O teste nativo reabre YDD de 120000 vértices, confere duas geometrias em cada LOD, índices válidos e paletas do osso escolhido. O teste de interface importa um OBJ de 120000 vértices e mantém uma seleção única; o teste Windows também converte e verifica seus binários.

Validação no [run 40125883418](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40125883418): 71 testes JS, 7 Python, suíte nativa, fluxo de packs e executável real no Windows passaram. O portable importou o OBJ de 120000 vértices, dividiu em duas geometrias, preservou uma seleção única e exportou um único drawable com todas as faces, UVs e vínculo, em todos os LODs. O OBJ real da captura não está disponível neste ambiente.

[Release 0.9.1](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.9.1) publicada; ZIP baixado e checksum conferido: 200,665,662 bytes; SHA-256 `d72e7588f64ca1dae3484d882bb086460715a732fc8aa8ecf6e6297958b68669`.

# Estado da versão 0.9.0 beta

Novo módulo 05 converte OBJ em YDD + YTD sem YDD de roupa de origem. Usa somente o esqueleto do ped selecionado, cria geometria/cores/pesos de 100% em um osso, shader ped_default com diffuse externa e dicionário YTD com mipmaps. O corpo do ped não entra na peça exportada. LOD alto/baixo possuem a mesma geometria.

Interface permite mover o OBJ ao osso, ajustar no gizmo/campos, desfazer/refazer posicionamento, preservar UV ou gerar ilhas de triângulos sem sobreposição entre partes, escolher cor/imagem e resolução, exportar PNG/guia/JSON e reabrir o par no editor de pintura.

Validação local: 69 testes JS e suíte nativa passaram. Também foi executado o comando real create-ydd da ponte, com reabertura pelos parsers JS. O teste de navegador exporta/reabre o ZIP, verifica nomes/sampler/pixels, imagem PNG, UV automático e Ctrl+Z/Y; o fluxo de packs continua passando. Testes usam assets sintéticos; aparência/animação com assets reais no FiveM não foi validada. Vínculo rígido a um osso, UV automático por triângulo e uma única imagem diffuse; sem pesos deformáveis, física ou simplificação de LOD.

Validação no [run 40040843696](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40040843696): 69 testes JavaScript, 7 Python, suíte nativa e fluxo de packs passaram. O executável portable foi testado no Windows: módulo 05 importou OBJ sem UV, selecionou osso, posicionou com desfazer/refazer, carregou imagem PNG, converteu pelo IPC real, verificou YDD/YTD e reabriu na pintura. O teste confere uma única geometria OBJ por LOD, sem corpo do ped, além de nome/sampler/pixels e UV gerado.

[Release 0.9.0](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.9.0) publicada. ZIP baixado e checksum confirmado: 200,665,013 bytes; SHA-256 `d78d18c3f092a6395c5bcc086b4de784c1d58dabb194e41977308123fd4980bd`. Ao importar o par no Pack de roupas, selecione o mesmo gênero usado para gerar a peça; o JSON da conversão registra esse gênero e o osso.

# Estado da versão 0.8.4 beta

Corrige o bloqueio de exportação com UVs negativos/acima de 1 quando a roupa ocupa o mapa inteiro. Mantém as coordenadas exatas, inclusive faces que cruzam os limites, preservando a repetição no shader. Reduzir a fonte repetida para uma subárea ainda é recusado, com orientação no editor antes da exportação. Reservar a área do OBJ substitui aqueles pixels como já ocorria no fluxo manual.

Validação nativa: YDD/YTD com OBJ reabertos; UV negativo e acima de 1 exatos em todos os LODs; UV não finito recusado; autoatlas de fonte repetida em subárea continua protegido. Teste Windows atualizado para exportar o fixture repetido e conferir os UVs, geometria e YTD. Teste de navegador verifica o aviso de redução e recuperação com Roupa no mapa inteiro.

Validação no [run 40027867528](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40027867528): 66 testes JS, 7 Python e suíte nativa passaram. Portable compilado, fluxo do pack testado no navegador e executável real testado no Windows, incluindo exportação do YDD com UV repetido + OBJ, reabertura do YTD e pintura da área adicionada.

[Release 0.8.4](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.8.4) publicada e ZIP baixado com checksum confirmado: 200,651,698 bytes; SHA-256 `0129d3e259a854298a7e30f9c459d24e29f36aa3873f137e1ab229b05d33a107`. Os testes utilizam fixtures sintéticos; o par YDD/YTD real da captura não está disponível para validar a aparência no jogo.

# Estado da versão 0.8.3 beta

Corrige a diffuse ausente ao associar YTD na aba de malhas, repetição de UV no preview, sobreposição de transparência no pack e referência de ped de outro gênero ao importar peças. O ped de malhas começa opaco e possui controle separado de transparência. Enquadrar com ped oculto usa a roupa.

Validação local: 66 testes JavaScript, build e testes de navegador do app completo e do pack passaram. O teste de navegador verifica que a cópia GLB contém a textura associada e amostragem com repetição nos dois eixos, além do controle de transparência do ped. Exportação nativa e coordenadas dos modelos não foram alteradas.

O preview permanece estático e o corpo usa material neutro. A captura não permite validar um possível defeito adicional de alinhamento/pose com o YDD real. O bloqueio do atlas para UV original fora de 0–1 permanece; repetir uma textura no preview não resolve o recorte/reempacotamento das faces na exportação.

# Estado da versão 0.8.2 beta

Inclui correção de persistência do gênero dos assets no round-trip do projeto e seleção coerente com o gênero visualizado. Regressão específica salva masculino, reabre com visualização feminina e importa arquivos homônimos sem misturar peças/texturas.

Novo gerenciador de packs: projetos com assets, autosave recuperável, histórico, componentes/gêneros, props, grupos/tags, ordenação/duplicação/remoção, variações independentes e integração de pintura, preview estático no ped e exportação multi-coleção FiveM. Convenções de props e enums incluídas no compilador YMT.

Validação local: testes de importação com lacunas, ambos os gêneros com mesmos basenames, projeto completo round-trip, variações, limite 128/255 e divisão de coleções, âncoras/nomes de props e entradas inválidas. O CodeWalker lê um YMT misto e confere structs/campos/tipos/referências/enums, componentes, props, texturas, salto/cabelo e flags. O navegador cria uma cópia, pinta, confirma a original inalterada, salva/reabre projeto e exporta o pack com props. Também verifica ped local, grupos/tags, ordenação de histórico e os fluxos dos outros módulos. Validação no [run 40011142547](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40011142547): 64 testes JS, 7 Python e suíte nativa passaram. O teste de interface do Pack passou no runner Linux e o executável portable passou no Windows, incluindo criar variação, exportar com props e salvar/reabrir o projeto.

[Release 0.8.2](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.8.2) publicada, baixada e checksum conferido: 200,651,432 bytes; SHA-256 `2d0646ec4f9f7c2bc2bea1f872d8ffa854b825c05cb6f3fca5131c23b16437c9`.

Preview estático com corpo neutro; props precisam de rig/âncoras corretos e não impedem clipping automaticamente. Testes usam fixtures originais sintéticas. Aparência e animação com os assets reais do usuário no FiveM/grzy ainda não foram executadas neste ambiente. A cobertura funcional e diferenças do grzy estão em grzyClothTool-reference.md.

# Estado da versão 0.7.0 beta

Janela de posicionamento manual do UV antes da exportação. A roupa começa no mapa inteiro e os OBJ em áreas pequenas. Mostra a textura de referência, ilhas OBJ, UV original opcional, medidas em pixels, movimento/escala por ponteiro e histórico próprio Ctrl+Z/Ctrl+Y. Confirmação reserva os pixels selecionados e exporta YDD/YTD/PNGs/JSON; cancelar mantém a cena. A transformação UV é aplicada a todos os LODs. Mapas auxiliares conservam o limite de 2048.

Validação local: suíte nativa reabre o YDD/YTD com retângulo manual, confere UV original inalterado em todos os LODs quando ocupa o mapa inteiro, UV do OBJ dentro da área escolhida, pixels originais fora da reserva, cinza dentro e rejeição de área fora dos limites. Testes JS cobrem a proporção inicial e limites/sobreposição. O navegador verifica movimento por ponteiro, redimensionamento numérico, desfazer/refazer, confirmação da reserva e cancelamento. Validação no [run 40003340472](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40003340472): 56 testes JS, 7 Python e suíte nativa passaram. O executável portable Windows abriu a janela, alterou medidas, desfez/refez, exportou o par com a área escolhida, verificou os UVs originais em todos os LODs e reabriu/pintou a textura sem alterar a metade esquerda.

[Release 0.7.0](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.7.0) publicada, baixada e checksum conferido: 200,634,903 bytes; SHA-256 `44677585fa0549e6edecfefa97025c322e2f50cb6643add8a2e28edc3b598d16`.

Não há detecção automática de espaço livre: reservar sobre uma área usada substitui aqueles pixels. Aumentar uma imagem já reduzida não recupera seus detalhes. Edição por retângulo de cada parte OBJ; não é unwrap artístico por vértice. Arquivos reais do usuário e aparência/animação no grzy/FiveM não foram validados neste ambiente.

# Estado da versão 0.6.3 beta

Correção do recurso RSC7 acima de 256 MiB: um atlas normal e outro specular de 4096 com mipmaps ocupavam duas páginas gráficas de 128 MiB, além das páginas de sistema. A diffuse permanece em até 4096 no YTD. Os mapas auxiliares passam a até 2048 com filtro de área, mipmaps completos e o mesmo UV normalizado. A interface informa o limite separado e o JSON inclui auxiliaryResolution. A redução pode perder detalhes de relevo/brilho; Preservar refere-se à diffuse.

Regressão local exporta/reabre um atlas 4096 com ambos os mapas: reserva YDD de 67.118.080 bytes e YTD de 134.225.920 bytes, ambos lidos pelos parsers JavaScript sem alterar o limite de 256 MiB. Confere resolução/mipmaps, pixels da roupa e região neutra do OBJ. Assets sintéticos originais; arquivos reais do usuário e aparência/animação no grzy/FiveM continuam sem validação neste ambiente.

Validação no [run 40001571630](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/40001571630): 53 testes JavaScript, 7 Python e suíte nativa passaram; portable compilado e executável Windows testado com sucesso. O navegador local passou e os parsers decodificaram ambas as imagens auxiliares 2048 e conferiram os UVs em todos os LODs.

[Release 0.6.3](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.6.3) publicada, baixada e checksum conferido: 200,627,245 bytes; SHA-256 `7107a3a39d002c08f1b24f1bfdcac1c7987dfc3afb07b6c352c86e6fda9fd37c`.

# Histórico da versão 0.6.2 beta

Resolve o bloqueio por tamanho do atlas sem aumentar o limite de 16 megapixels. Materiais com as mesmas imagens diffuse/normal/specular compartilham uma área, e a quantidade de colunas é escolhida para minimizar o lado necessário. A resolução possui opções Ajustar até 4096/2048/1024 e Preservar original. Se necessário, Ajustar reduz as imagens com filtro de área (alpha ponderado para diffuse), mantendo o UV e os mapas auxiliares alinhados. Preservar não reduz silenciosamente. O botão Calcular tamanho do atlas mostra dimensões, áreas/materiais e fator de redução antes de exportar; o cálculo não modifica os vértices. O ZIP inclui atlas-info.json. Imagens antigas que deixaram de ser referenciadas não são duplicadas no YDD.

Validação no [run 39992976802](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39992976802): 53 testes JS, 7 Python e suíte nativa passaram. A suíte nativa verifica 9 materiais com imagens idênticas usando uma região, entrada 4096 com atlas necessário 8192 sendo ajustada para 4096, modo Preservar sem alteração silenciosa, cálculo sem mutação, filtro de redução com padrão alternado e UVs/posição preservados nos LODs. O executável Windows usou a fixture 4096 pela UI para conferir cálculo e os modos Ajustar/Preservar, depois exportou/reabriu/pintou o atlas e comparou toda a metade da roupa. O fluxo CLI + navegador também passou localmente.

Verificação adicional local: uma exportação completa pela CLI com a textura DXT1 sintética 4096 gerou atlas 4096×4096. O par YDD/YTD foi reaberto pelos parsers JavaScript e conferido para diffuse única, pixels da roupa/OBJ e separação de UV nos dois LODs. O arquivo real do usuário não foi disponibilizado; aparência/animação no grzy/FiveM continuam dependentes desse teste real.

[Release 0.6.2](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.6.2) publicada, baixada e checksum conferido: 200,624,977 bytes; SHA-256 `f2ab426bbd9b208f6cd839244210d35c5bc35da7268885b8cca1ebe23b3628d1`.

# Histórico da versão 0.6.1 beta

Corrige o bloqueio do atlas para o sampler opaco `0x8ab98831` referenciando `givemechecker` sem imagem atribuída. Esse nome é o fallback de `FbxConverter.GetTextureBaseParam` no CodeWalker. Quando não existe imagem no parâmetro, no YTD ou no dicionário embutido, o slot desconhecido mantém hash e referência sem ser tratado como um mapa UV real. Normal/specular não atribuídos recebem regiões neutras no atlas auxiliar; secondary diffuse provisória ausente é preservada. Uma imagem real chamada givemechecker continua sujeita às verificações de compatibilidade.

Validação no [run 39989334222](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39989334222): 53 testes JavaScript, 7 Python e suíte nativa .NET passaram. A fixture própria `native-clothing-checker.ydd` reproduz o hash e nome do erro reportado. O teste nativo salva/reabre a fixture, gera atlas, confere preservação do slot em todos os LODs, normal neutro, secondary diffuse provisória e proteção para checker com imagem real. O executável Windows empacotado usou essa fixture pela UI, exportou o ZIP, reabriu YDD/YTD, pintou o OBJ e verificou que a metade da roupa ficou intacta. O arquivo real do usuário não foi disponibilizado; a validação reproduz o caso com dados sintéticos.

[Release 0.6.1](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.6.1) publicada, baixada e checksum conferido: 200,615,656 bytes; SHA-256 `a35773860db74f168ddc869f09efcb80eac96371f36fddb9392c5c19792c2b44`.

# Histórico da versão 0.6.0 beta

Atlas único de roupa e OBJ implementado. A diffuse original ocupa a região esquerda com seus pixels preservados, e as ilhas dos OBJ incorporados ficam na direita. Os UVs são atualizados em todos os LODs, mantendo posição/rig e o mesmo sampler principal. O YTD contém uma única entrada diffuse; mapas normais/speculares disponíveis são reorganizados e incorporados no YDD, com regiões neutras para o OBJ. Paletas compatíveis permanecem disponíveis. A saída ZIP inclui YDD/YTD, `UV/atlas-textura.png` e o guia transparente `UV/atlas-uv.png`.

Validação no [run 39984907575](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/runs/39984907575): 53 testes JavaScript, 7 Python e suíte nativa .NET passaram. A suíte nativa verifica YTD com uma única diffuse, pixels originais, UVs separados em todos os LODs, mapas auxiliares embutidos, remoção de diffuse embutida antiga que poderia sobrepor o atlas, UVs repetidos recusados e variação de textura de entrada única. O executável Windows exportou o ZIP pelo botão, reabriu o par nativo, confirmou presença e posição do OBJ nos LODs e pintou o OBJ no atlas; comparou todos os pixels da metade esquerda e verificou que ficaram inalterados. O fluxo completo também passou localmente no navegador usando a CLI nativa.

[Release 0.6.0](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases/tag/v0.6.0) publicada, baixada e checksum conferido: 200,614,454 bytes; SHA-256 `471ed4f4ea6f053236482ceb53003bb5c12d406da7fa60443fc3f618e93dd4ec`.

O atlas trata a incompatibilidade estrutural do override da primeira textura no preview do grzy, identificada em seu código-fonte. O grzy e o FiveM não foram executados com os arquivos reais do usuário neste ambiente. Esses arquivos ainda são necessários para confirmar aparência/animação do caso reportado. Limites: atlas quadrado até 4096×4096, área OBJ inicialmente cinza, ilhas triangulares, UV original em 0–1, mapas auxiliares disponíveis e samplers compatíveis. Casos fora desses limites são recusados sem modificar os arquivos originais.

# Histórico da versão 0.5.2 beta

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
