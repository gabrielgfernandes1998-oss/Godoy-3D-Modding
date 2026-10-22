# Godoy Cloth Fivem

**Developed by Gabriel Godoy.** Editor de roupas e texturas 3D para FiveM, anteriormente chamado PAINTFIVE Studio. A versão 0.3.1 usa tema vermelho, logo e ícone fornecidos pelo autor.

## Windows portable

Baixe em [Releases](https://github.com/gabrielgfernandes1998-oss/PAINTFIVE/releases), extraia **todo o ZIP** e execute `GodoyClothFivem.exe`. Não precisa instalar Node.js. Requer Windows 10/11 x64 e WebGL. O executável não tem assinatura digital.

O botão X fecha normalmente. Se houver trabalho não salvo, o aplicativo mostra **Continuar editando** ou **Descartar e sair**, em vez de bloquear o fechamento silenciosamente.

## Abrir e exportar roupas

1. Use **Abrir** para escolher um YDD, GLB/GLTF ou projeto. No YDD, selecione drawable e LOD no explorador.
2. Use **YTD** para abrir as texturas. Escolha a textura no dicionário. Vínculos diffuse são associados pelo nome; se necessário, use **Vincular textura selecionada**. Só é possível pintar superfícies vinculadas à textura ativa.
3. Trabalhe nas camadas, no 3D ou na aba **Mapa UV**.
4. **Salvar projeto** gera um `.godoycloth` com modelos, texturas, camadas, objetos, fontes locais e vínculos editáveis. Reabra usando **Abrir**. Projetos `.paintfive` das versões anteriores continuam aceitos; textos já achatados nessas versões não podem ser reconstruídos como objetos.
5. **Exportar YTD editado** gera uma cópia pronta do dicionário com as camadas compostas. **Exportar textura** gera o PNG composto. **YTD/PNG não armazenam camadas editáveis**: mantenha também o projeto `.godoycloth`.

Texturas embutidas em um YDD podem ser exportadas em uma cópia do YDD, preservando a geometria. Os originais não são sobrescritos automaticamente. Não há salvamento automático; abrir uma nova textura base substitui o conjunto de camadas ativo após confirmação quando houver edições.

## Camadas e objetos

- O documento começa com **Textura base** bloqueada e uma camada **Pintura** transparente. Desbloqueie a base se precisar editar seus pixels; prefira pintar por cima.
- Crie, duplique, renomeie, reordene, oculte, bloqueie e exclua camadas. A ordem visual é de cima para baixo.
- Cada camada tem opacidade, brilho, contraste e mesclagem **Normal**, **Multiply**, **Overlay** ou **Screen**.
- **Texto**, **imagem**, **forma** e **Bézier** continuam sendo objetos editáveis. Selecione-os na lista e use **Mover**, os campos X/Y, escala e rotação. Largura e altura ficam disponíveis para imagens e formas.
- O pincel em um objeto cria uma camada raster para não achatar o objeto. A borracha atua apenas nos pixels de camadas raster. O movimento de objetos não transforma camadas raster inteiras.
- Cada textura do YTD mantém seu próprio documento de camadas. Trocar de textura preserva suas edições. O projeto salva os documentos editados.
- Desfazer/refazer é por documento, com até 16 etapas e um orçamento de memória para o histórico.

## Texto, fontes e vetores

**Texto (T):** escreva o conteúdo no painel, escolha fonte e tamanho e clique na roupa ou no mapa para posicionar. Depois, selecione a camada para alterar o texto, fonte, alinhamento, negrito/itálico, cor, contorno e sombra. Os controles de sombra incluem cor, blur e deslocamento X/Y.

**Fontes locais:** em Texto, clique em **Carregar fonte .TTF / .OTF**. A fonte é carregada no aplicativo e incorporada ao projeto, sem precisar instalá-la no Windows. Até 24 fontes, com 10 MB por arquivo. Nenhum upload externo é necessário.

**Linha (L), retângulo (R) e círculo/elipse (O):** arraste entre os pontos inicial e final. Edite cor, preenchimento, espessura, dimensões, posição, escala e rotação da camada depois.

**Pen/Bézier (P):** clique para adicionar âncoras; arraste ao criar cada ponto para definir tangentes suaves. Pressione **Enter** ou **Concluir curva**. Para editar novamente, selecione a camada, ative **Mover (G)** no **Mapa UV** e arraste as âncoras ou alças. **Alt** permite editar uma alça sem espelhar a outra. Há opções para fechar e preencher a curva.

**Imagem (I):** escolha a imagem e clique/arraste na roupa ou no mapa. A imagem continua em sua própria camada e pode ser transformada depois. O posicionamento usa as ilhas UV; não é uma projeção contínua entre costuras.

## Pintura, preenchimento e seleção

- **Pincel (B):** tamanho, opacidade e suavidade. **Borracha (E):** remove pixels da camada raster, revelando as inferiores.
- **Conta-gotas (C):** clique no 3D ou no mapa para capturar a cor do resultado composto.
- **Lata de tinta (F):** escolha **Área de cor conectada** com tolerância, **Seleção UV inteira** ou **Material da superfície**. Uma seleção ativa também limita o preenchimento.
- **Ilha UV (U):** clique na roupa ou no mapa para selecionar o conjunto de triângulos ligado por arestas UV. O pincel fica limitado à região. Use **Limpar seleção** para pintar sem restrição.
- **Mascarar camada** aplica a seleção ao objeto/camada de forma não destrutiva; **Remover máscara** a libera. Objetos criados durante uma seleção recebem a máscara da ilha.

UVs sobrepostos compartilham os mesmos pixels da textura: selecionar uma ilha não torna independentes superfícies que reutilizam esses pixels. Máscaras são fixadas no mapa UV. A seleção não é um sistema geral de laço ou pintura livre de máscaras.

## Câmera e iluminação

- Presets ortográficos: **Frente, Trás, Esquerda, Direita e Topo**. **Perspectiva** retorna à projeção livre.
- **W** sobe, **S** desce, **A** desloca para a esquerda e **D** para a direita, no plano da câmera. As teclas funcionam enquanto pressionadas e não interceptam a digitação em campos.
- Botão direito orbita; botão do meio faz pan; roda aplica zoom. **V** ativa navegação com o botão esquerdo.
- Iluminação **Studio**, **Dia** e **Noite** altera as luzes e a exposição do preview. É uma aproximação visual, sem reproduzir todos os shaders/condições do GTA.

| Atalho | Ação |
| --- | --- |
| B / E | Pincel / borracha |
| G / I / T | Mover objeto / imagem / texto |
| L / R / O / P | Linha / retângulo / círculo / Bézier |
| F / C / U | Preenchimento / conta-gotas / ilha UV |
| WASD | Pan da câmera (D não ativa imagem) |
| Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z / Ctrl/Cmd+Y | Desfazer / refazer |
| Enter / Esc | Concluir curva / cancelar ferramenta |

## Compatibilidade e limites

- YDD RSC7 **165** e YTD RSC7 **13**, GTA V Legacy/FiveM não protegidos.
- DXT1/DXT3/DXT5 e BGRA8/BGRX8/RGBA8: leitura e exportação. Mipmaps editados são regenerados; DXT tem perda.
- ARGB1555/A8/L8/ATI1/ATI2: leitura; exporte PNG para edições nesses formatos.
- Texturas não editadas, metadados e geometria são preservados no recurso descomprimido. Blocos de textura compartilhados não são gravados para evitar modificar outra textura inadvertidamente.
- Sem suporte a **BC7, Enhanced/Gen9, RPF, arquivos protegidos, animação/rig ou shaders GTA completos**.
- Até 48 camadas por documento, 64 megapixels em fontes raster/imagens por documento; cache de renderização limitado. Até 80 MB por arquivo/projeto, 256 MB por recurso descomprimido, 8192 pixels por lado e 16 megapixels por textura. Projetos muito grandes precisam ser divididos ou exportados separadamente.
- Não altera geometria, não adiciona/remove texturas do dicionário e não faz projeção de decals atravessando costuras. Confira as cópias exportadas no jogo antes de distribuí-las.

## Desenvolvimento e testes

Node.js 22+ e npm. Use o checkout existente em `/workspace/PAINTFIVE`; não é necessário criar worktree.

```sh
npm ci --cache /tmp/paintfive-npm
npm run dev -- --port 5173
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:browser
```

Use `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` quando esse navegador já estiver instalado. Os testes de navegador verificam formatos nativos, camadas e valores de mesclagem, texto/fonte, imagens, formas, Bézier, seleção UV, preenchimento, edição após reabertura e mudanças reais de câmera/iluminação. Resultados ficam em pastas temporárias informadas no terminal.

```sh
npm run test:assets -- /pasta/com/ydd-e-ytd
GODOY_DESKTOP_EXE=/caminho/GodoyClothFivem.exe npm run test:desktop
```

O teste desktop inicia o Electron real, verifica pintura e fechamento limpo e provoca o fechamento com alterações. Simula apenas a escolha dos botões do diálogo para verificar **Continuar editando** e **Descartar e sair**. A automação de release também executa esse teste com o portable em um runner Windows.

Fixtures incluídas são triângulos/pixels originais. A versão nativa foi validada adicionalmente com seis YDD e oito YTD públicos de [jim_g_White_Widow.pack](https://github.com/jimgordon20/jim_g_White_Widow.pack), mantidos fora do repositório e do portable. O DXT5 foi comparado com Pillow, diferença máxima de 1 por canal por arredondamento. As definições públicas de [CodeWalker](https://github.com/dexyfex/CodeWalker/tree/master/CodeWalker.Core/GameFiles/Resources) foram consultadas para investigar o formato; o parser e codecs aqui são próprios.

Não há banco, segredos ou serviços externos obrigatórios. Fontes web são opcionais; há alternativas locais. Arquivos, fontes locais e projetos são processados no próprio aplicativo.

## Gerar e publicar o portable

Em Linux com `zip`:

```sh
npm ci
npm test
npm run package:windows
```

O arquivo sai em `release/Godoy-Cloth-Fivem-0.3.1-Windows-x64-Portable.zip`. Inclui Electron 45.0.0 e o build. O checksum do Electron é verificado pelo empacotador. Em Node.js 24 atrás de proxy use `NODE_USE_ENV_PROXY=1 npm run package:windows`.

Tags `v*` acionam a compilação, testes web, teste do executável em Windows e publicação. Execução manual gera artifacts, sem release. Logs em [Actions](https://github.com/gabrielgfernandes1998-oss/PAINTFIVE/actions).

A automação registra os resultados de compilação, teste Windows e publicação em tags anotadas `checks/<versão>/<execução>`. Isso permite verificar a publicação por Git autenticado quando a API ou a página privada do repositório não estão disponíveis no ambiente. Essas tags contêm somente metadados de resultado e não acionam novas compilações.
