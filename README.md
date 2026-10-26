# Godoy 3D Modding · 0.11.1 beta

Studio local de roupas, malhas e pinturas de veículos para GTA V Legacy/FiveM. Developed by Gabriel Godoy.

## Windows 10/11 x64 portable

Os downloads são publicados em [GitHub Releases](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases). O workflow [Windows portable release](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/workflows/portable-release.yml) compila e publica o ZIP e o SHA-256 quando uma tag `v` correspondente à versão do `package.json` é enviada.

Extraia **todo o ZIP** `Godoy-3D-Modding-0.11.1-Windows-x64-Portable.zip` e execute `Godoy3DModding.exe`. Não precisa instalar Node.js, Python ou .NET no computador de uso. Requer driver com suporte a WebGL. O executável não é assinado digitalmente.

Os arquivos são processados localmente. Salve seus projetos em uma pasta escolhida por você; o Pack de roupas oferece recuperação de autosave e projeto `.godoypack` com os assets incluídos. O pacote não inclui arquivos originais GTA, ped base ou modelos comerciais.

## Recursos desta versão

| Módulo | Disponível | Limites |
| --- | --- | --- |
| Pack de roupas | Projetos, importação por arquivo/pasta, associação YDD/YTD, componentes e props, grupos/tags/busca, duplicação/ordenação, variações, preview no ped e geração de coleções YMT/META/manifest | Preview estático; não refaz rig, não simula física nem elimina clipping. Teste no FiveM com seus assets. |
| Pintura de roupas | YDD/YTD, seleção de drawables/LODs, pintura 3D/UV, camadas, texto, imagem, exportação YTD e texturas embutidas | Baseada no PAINTFIVE; não recompila alterações de geometria. |
| Associação de arquivos | Importação de conjunto, busca por nome e referências de materiais; escolha manual em caso de empate | Só acessa arquivos selecionados pelo usuário. |
| Integração editor/pack | Exportar YTD no editor atualiza o conjunto do pack com o nome original e o YDD aberto | Cada variação aberta pelo Pack tem identificação própria; editar a cópia preserva a original. |
| Malhas e objetos | Peça inteira sobre o ped; posição/rotação/escala gravadas no YDD original; preservar pesos ou prender rigidamente à pelve/cabeça/tronco; desfazer/refazer; GLB e união OBJ nas opções avançadas | Incorpora OBJ num atlas único de roupa + acessório e UV automático em ilhas triangulares, herdando pesos da região próxima. Sem YFT, unwrap artístico, pintura manual de pesos, animação ou colisão. Layouts incompatíveis são recusados. Teste FiveM real pendente. |
| Pintura de veículos | YFT e _hi.yft visualizáveis, seleção de drawables/LODs, materiais e pintura YTD | Baseada no Godoy-Paint-Car. Não reconstrói bones/fragment physics/damage nem gera novo _hi.yft. |

Não é a implementação completa dos três módulos originais. O editor já exporta alterações e OBJ em YDD; geometria YFT e validação visual no FiveM com assets reais continuam pendentes. O workflow exige um teste do executável em Windows antes de publicar. Consulte [estado da versão](docs/release-status.md).

## Criar um pack

1. Na aba **Pack de roupas**, escolha o nome e o gênero.
2. Selecione YDD e YTD juntos ou selecione uma pasta. Exemplo:

```text
jbib_000_u.ydd
jbib_diff_000_a_uni.ytd
jbib_diff_000_b_uni.ytd
feet_000_r.ydd
feet_diff_000_a_whi.ytd
```

3. Organize as peças por componente, gênero, grupo e tags. Os índices de entrada podem ter lacunas: a exportação gera nomes externos consecutivos e preserva os bytes dos modelos/texturas. Arquivos com prefixo `colecao^` também são aceitos. Para props, use por exemplo `p_head_019.ydd` + `p_head_diff_019_a.ytd`.
4. Gere o ZIP. Ele inclui `fxmanifest.lua`, `mp_m_freemode_01_nome.meta` (ou feminino), YMT e os YDD/YTD organizados em `stream/[male]/jbib/`, etc. O `dlcName` no META e o hash interno do YMT usam o nome da coleção; `fullDlcName` inclui o ped.
5. Extraia como um recurso na base, adicione `ensure nome_do_recurso` e confira **no servidor FiveM Legacy** antes de distribuir. O `export-report.json` registra componentes e referências externas de textura; referências não resolvidas precisam ser conferidas.

O gerador de YMT cria um recurso RSC7 v2 CPedVariationInfo. Sua estrutura foi lida por um leitor independente CodeWalker; isso não substitui testar os arquivos no jogo. YDD/YTD são analisados e copiados, sem alterar seus bytes. Limites: 80 MB por arquivo, 256 MB de assets por projeto/exportação e até 26 variações por peça. O exportador divide automaticamente em coleções quando ultrapassa 128 drawables ou 255 texturas por componente, ou 255 props no total.

## Desenvolvimento

Node.js 24.19.0 e npm 11 foram usados neste ambiente. Use essa versão de Node para o comando portable, que ativa o proxy de download pelo runtime. Python 3.12+ é necessário apenas para a CLI legada.

```bash
npm ci --ignore-scripts --cache /tmp/godoy-npm-cache
npm test
npm run build
npm run dev
```

O app web serve apenas como ambiente de desenvolvimento. O portable incorpora o runtime Electron 45.0.0. Para compilar o ZIP Windows x64:

```bash
npm run package:windows
```

A compilação requer os utilitários zip/unzip no host (presentes neste ambiente Linux). O processo baixa o Electron com verificação de checksum e gera o ZIP em `release/`, junto com SHA-256. Compilar em Linux é suportado; executar o EXE exige Windows. Para o teste de navegador, instale Chromium com `npx playwright install chromium` ou informe `CHROMIUM_PATH`, depois execute `npm run test:browser` com o build pronto.

## Publicar um portable já compilado

Com o ZIP e o SHA-256 presentes em `release/`, `npm run release:check` confere o arquivo local. `npm run release:publish` cria a pré-release se necessário, envia os anexos e confirma tamanho e SHA-256 retornados pelo GitHub. Exige GitHub CLI autenticado e acesso a `api.github.com` e `uploads.github.com`. Falhas de rede ou autenticação interrompem a publicação; elas não são tratadas como sucesso. Um anexo existente diferente não é sobrescrito automaticamente.

## CLI Python legada

O empacotador original continua disponível para arquivos **já preparados**, com YMT e META fornecidos externamente. Ele não é usado pelo portable:

```bash
python3 -m unittest discover -s tests -v
python3 -m godoy.clothing.exporter /caminho/preparados --pack demo --gender male --output /tmp/godoy-demo
```

A CLI legada aceita apenas `_u/uni` e o contrato antigo de META (`dlcName` igual ao prefixo completo). Prefira o gerador web/desktop para novos packs. A evolução desse contrato fica separada para preservar a compatibilidade da primeira versão.

## Créditos

Integra os projetos do autor [PAINTFIVE](https://github.com/gabrielgfernandes1998-oss/PAINTFIVE) e [Godoy-Paint-Car](https://github.com/gabrielgfernandes1998-oss/Godoy-Paint-Car), conforme solicitado. Commits de origem e avisos preservados em `modules/*/UPSTREAM.md` e `THIRD_PARTY_NOTICES.txt`. A partir da 0.2.4, o núcleo CodeWalker da variante grzyClothTool acompanha o portable, com fontes e licença GPL-3.0.

## Correção da tela vazia (0.2.1)

O carregador desktop anterior chamava `net.fetch(file://...)`, que era bloqueado pelo próprio filtro de rede. O protocolo local agora lê os assets diretamente do ASAR e serve seus tipos MIME corretos, mantendo sandbox, CSP e bloqueio de arquivos arbitrários. Falhas de carregamento registram `startup.log` na pasta de logs do aplicativo.

A aba Malhas agora mantém um ped de referência por gênero em uma biblioteca local (IndexedDB). Importe um YDD/GLB autorizado uma vez; alterne masculino/feminino e mostre ou oculte a referência. O ped é excluído da exportação GLB. Na 0.2.3 há uma ponte externa para ler os componentes base do ped em x64v.rpf, usando o CodeWalker e o GTA V Legacy selecionados pelo usuário.

O repositório grzyClothTool foi examinado como referência. Seus peds vêm da instalação local do GTA V; não são modelos completos incluídos no repositório. Veja [análise da referência](docs/grzyClothTool-reference.md).

## OBJ, histórico e CodeWalker (0.2.3)

A importação de OBJ mantém a câmera e a cena existentes. **Enquadrar cena inteira** mostra os modelos e o ped; **Centralizar seleção** aproxima apenas o objeto escolhido. Objetos OBJ preservam suas unidades e coordenadas; ajuste a escala se o arquivo vier em centímetros/milímetros.

**Ctrl+Z** desfaz importação, transformação por campos/gizmo e união de malhas. **Ctrl+Y** ou **Ctrl+Shift+Z** refazem. O histórico retém até 32 operações. Dentro de campos de texto, os atalhos continuam editando o texto. A união é reversível, preservando a geometria anterior até sair do histórico.

No portable Windows, em **Malhas → CodeWalker · ped do GTA**:

1. O Godoy procura automaticamente GTA V Legacy nas bibliotecas Steam. O núcleo CodeWalker já está integrado.
2. Somente se não encontrar o jogo, clique **Selecionar diretório do GTA V** e escolha a instalação **Legacy**, contendo `GTA5.exe` e `x64v.rpf`.
3. Selecione masculino/feminino e clique **Carregar ped deste gênero do GTA**.

A ponte .NET usa a biblioteca local para ler os componentes base de cabeça, tronco, pernas, pés e mãos em `x64v.rpf`; o preview é estático e pode informar componentes ausentes. A cópia é guardada na biblioteca local. O jogo e seus RPFS não são modificados. Na 0.2.4, CodeWalker.Core e suas dependências acompanham o ZIP; os arquivos GTA não são distribuídos. O runtime .NET necessário à ponte está incluído; seus avisos de licença ficam em `resources/native-bridge/`.

A conexão/carregamento da biblioteca e o round-trip YDD foram exercitados com CodeWalker.Core real e um drawable de referência reservado do grzyClothTool, somente fora do pacote. A extração do ped de uma instalação GTA real ainda exige validação no computador do usuário: não existe uma instalação GTA neste ambiente. A ponte não aplica animações/skinning e **ainda não recompila o OBJ editado em YDD/YFT**; essa etapa continua exigindo um pipeline de rigging e escrita nativa. Não substitua um recurso FiveM pelo GLB.

Para compilar o portable dos fontes agora é necessário também **.NET SDK 8** no host de build. `npm run package:windows` compila a ponte para Windows x64, gera o frontend e empacota tudo. O usuário final não precisa instalar o SDK/runtime .NET.

### Compilar o CodeWalker fornecido em código-fonte

Se o ZIP contém `CodeWalker.Core.csproj`, extraia-o e, com SDK .NET 8 instalado, execute:

```sh
npm run build:codewalker -- /caminho/CodeWalker/CodeWalker.Core
```

O comando compila o núcleo e suas dependências em `native/publish/codewalker-local`.
Ao compilar o portable, essa pasta é incluída automaticamente em `resources/codewalker-local`; o usuário não precisa selecioná-la.
Sem argumento, o comando compila os fontes incluídos em `third_party/CodeWalker.Core`. O portable inclui o resultado e os fontes correspondentes.

Para deixar os dois peds disponíveis, importe uma referência completa YDD/GLB com o gênero
masculino selecionado e outra com o feminino. A biblioteca local guarda cada referência
separadamente. Os arquivos de ped não vêm no código-fonte CodeWalker.
Na 0.3.0, **Exportar peça YDD** grava os ajustes no YDD original, preservando materiais, UVs e LODs, com opção de manter pesos ou vincular o acessório rigidamente a um osso. O ped de referência não é incluído na peça exportada.

### GTA Steam automático (0.2.4)

O portable inclui CodeWalker.Core; não é necessário instalar ou configurar CodeWalker.
A busca consulta o registro Steam, as pastas padrão, `libraryfolders.vdf` e o manifesto
Steam 271590, incluindo bibliotecas em outros discos. Só aceita GTA V Legacy com
`GTA5.exe` e `x64v.rpf`. Se não encontrar, mostra **Selecionar diretório do GTA V**;
a escolha válida é lembrada. Selecione masculino/feminino e clique **Carregar ped**.
A leitura real do RPF continua dependendo de validação com uma instalação local do GTA.


### Reposicionar um acessório e exportar YDD (0.3.0)

1. Carregue o ped masculino/feminino e importe o YDD da peça.
2. Clique na peça no viewport ou na lista plana. A peça inteira é selecionada; drawables e LODs não são separados na interface.
3. Mova, gire e ajuste a escala sobre o ped. Todos os LODs acompanham a transformação.
4. Para prender o boné ao cinto, escolha **Cintura · SKEL_Pelvis**. Isso substitui os pesos por vínculo rígido à pelve quando a peça tem skinning; para peça rígida, grava o vínculo e as coordenadas locais do osso. Para roupa deformável, mantenha pesos originais.
5. Clique **Exportar peça YDD**. O portable reabre e verifica os bytes de vértices, pesos, índices e LODs antes de disponibilizar o arquivo, mantendo o nome original. Use com o YTD original no recurso.

O esqueleto da peça é preservado; quando falta o osso escolhido, pode ser usado o esqueleto do ped YDD importado/carregado do GTA, guardado por gênero. GLB sozinho não fornece um esqueleto GTA nativo. O ped em si não é modificado.

O exportador recusa layouts de posição/normal não suportados, buffers compartilhados/duplos distintos e colisões próprias. A partir da 0.4.0, OBJ incorporado é gravado como geometria adicional nos LODs do YDD; GLB permanece como cópia avançada. Não converte registro de prop de cabeça para componente de roupa: se o boné for equipado pelo jogo como prop de cabeça, o recurso também precisa registrá-lo no componente apropriado para uso no cinto. Nome/META/YMT de um recurso existente não são convertidos automaticamente por este botão.

Validação automatizada cobre serialização nativa, movimento/rotação/escala, normais, UVs, vínculo rígido, pesos preservados, esqueleto doador e LODs com nível intermediário ausente. A animação real no FiveM ainda precisa ser validada com o YDD/YTD do usuário.


### Pivô e enquadramento OBJ (0.3.2)

O gizmo fica no centro da geometria visível, mesmo quando a origem do OBJ está longe.
A transformação é aplicada ao objeto original; a correção do pivô não altera os vértices de origem nem acrescenta um deslocamento à exportação YDD.
**Enquadrar peça + referência** mantém YDD/ped e a seleção na vista. **Trazer seleção para a referência** recupera objetos já afastados e pode ser desfeito.
Na importação, OBJ muito distante da referência é colocado ao lado dela; se a proporção de tamanho passar de 20× ou cair abaixo de 0,05×, a escala também é adaptada e informada no status. O arquivo original não é sobrescrito.


### Incorporar OBJ ao YDD (0.4.0)

1. Posicione o OBJ sobre o YDD.
2. Em **Peça de destino**, escolha o YDD. Em **Objeto a incorporar**, escolha o OBJ. O OBJ pode continuar selecionado no viewport.
3. Clique **Unir OBJ à peça**. A lista passa a mostrar um conjunto; gizmos movem os dois juntos. Ctrl+Z separa e Ctrl+Y restaura a união.
4. Clique **Exportar peça YDD**. O arquivo contém a geometria original e o OBJ incorporado, com o nome original. Use o YTD correspondente.

A incorporação mantém a posição mesmo com escala não uniforme no destino, converte os eixos, copia a geometria adicional aos LODs existentes e preserva os canais originais do YDD. Cada parte herda material e os quatro pesos/índices do vértice mais próximo ao seu centro; o acessório acompanha aquela região do esqueleto. Não há decimação automática para LODs. As superfícies ficam no mesmo YDD; a operação não faz solda booleana das bordas.

UVs do OBJ são mantidos; se faltarem, é criada uma projeção planar simples. A textura própria/MTL do OBJ não é adicionada ao YTD: o material existente do destino é reutilizado e pode exigir ajuste de UV/pintura. Limites: 65535 vértices por parte, 100000 no total, 32 partes e 10 MB de dados de incorporação. A leitura de reabertura verifica os novos vértices, índices, pesos, vínculo e LODs antes do download. A animação no FiveM com assets reais ainda precisa ser validada.

### Histórico: UV e textura própria do OBJ (0.5.0–0.5.2)

**Compatibilidade em investigação:** o preview do grzyClothTool aplica a primeira textura do YTD como diffuse em todas as geometrias. A exportação 0.5.2 com diffuses independentes pode aparecer incorreta nesse fluxo. Os testes no editor Godoy não validam esse comportamento nem comprovam renderização no FiveM. Consulte [a investigação e os arquivos necessários](docs/texture-investigation.md).

1. Posicione e una o OBJ ao YDD.
2. Selecione o conjunto YDD e clique **Associar YTD original para gerar UV**. Escolha o dicionário correspondente à roupa.
3. Clique **Exportar peça YDD**. Com OBJ, baixa um ZIP contendo o YDD original atualizado, o YTD atualizado e a pasta `UV/` com guias PNG transparentes.
4. Extraia o ZIP e abra o par YDD/YTD em **Pintura de roupas**, usando **Abrir conjunto de modelos + YTD**.
5. Em **TEXTURAS DO DICIONÁRIO**, selecione a nova diffuse `godoy_obj_…` (sem sufixos `_n` e `_s`). Pinte no 3D ou no mapa UV. Exporte o YTD editado.
6. Use o novo YDD e o YTD editado juntos no recurso FiveM, com os nomes/registro corretos do recurso original.

Um YTD pode conter várias texturas. O material do colete mantém a referência à textura original; o material adicional do OBJ referencia uma nova entrada no mesmo dicionário. UVs e pixels da roupa não são rearranjados. A nova textura começa cinza, com mipmaps completos; mapas auxiliares neutros evitam aplicar o normal/specular do colete ao acessório.

O UV automático separa cada triângulo em uma ilha para impedir sobreposição, inclusive em OBJ sem UV ou com faces sobrepostas. É um ponto inicial editável; não substitui um unwrap artístico. Limite de 21845 triângulos por parte, 100000 vértices após costuras e 10 MB por requisição. MTL e imagens originais do OBJ não são importados. A estrutura é validada automaticamente; aparência e animações no FiveM com assets reais precisam ser verificadas no jogo.

### Atlas único: roupa e OBJ no mesmo mapa (0.6.3)

1. Importe o YDD original, posicione o OBJ e una à peça.
2. Selecione o conjunto e **Associe o YTD original** da roupa.
3. Clique **Exportar YDD + atlas UV** e extraia o ZIP.
4. Abra o novo YDD e o novo YTD juntos em **Pintura de roupas**. A textura principal contém as áreas da roupa à esquerda e do OBJ à direita. O OBJ começa cinza.
5. Pinte no modelo ou no mapa UV e exporte o YTD editado. Use esse YTD junto ao novo YDD, mantendo os nomes e registro do recurso.

O ZIP inclui uma cópia PNG da imagem final e o guia UV transparente de ambas as malhas. O atlas é quadrado, até 4096×4096. Materiais com imagens idênticas compartilham uma região. A resolução original é preservada quando couber; a opção Ajustar reduz imagens grandes quando necessário, mantendo o UV alinhado. O YTD possui uma única diffuse; os mapas auxiliares compatíveis são reorganizados e incorporados no YDD. Isso trata a substituição da primeira textura aplicada pelo preview de ped do grzy, sem depender de múltiplas diffuses independentes.

**Calcular tamanho do atlas** mostra a resolução final e o fator de redução antes de exportar. Escolha **Ajustar até 4096** (padrão), 2048 ou 1024 para caber no limite, ou **Preservar resolução original** para impedir redução. Reduzir pode perder detalhes finos; `atlas-info.json` registra a opção e o resultado. Mapas auxiliares não encontrados, UVs fora de 0–1 e shaders especiais interrompem o export com diagnóstico. A reorganização automática não faz unwrap artístico nem importa imagens/MTL do OBJ. Validação estrutural e pintura usam fixtures originais; os arquivos reais do usuário e a animação no FiveM ainda precisam ser conferidos.

Na versão 0.6.3, mapas auxiliares de normal/brilho embutidos no YDD ficam limitados a 2048×2048, com mipmaps completos e UV normalizado alinhado à diffuse de até 4096×4096. Isso evita a reserva de duas páginas gráficas de 128 MiB que ultrapassava o limite de leitura de 256 MiB. O cálculo informa essa resolução separadamente e o JSON a registra em `auxiliaryResolution` (zero quando não há mapas auxiliares). A opção Preservar se refere à diffuse; os mapas auxiliares seguem esse limite e podem perder detalhes finos.

### Posicionamento manual do UV antes de exportar (0.7.0)

Ao exportar uma peça com OBJ incorporado e YTD associado, uma janela mostra a textura original e as áreas UV. A roupa começa ocupando o mapa inteiro; cada parte OBJ começa pequena. Selecione a parte, arraste para uma região livre e use o quadrado do canto inferior direito para expandir/reduzir, ou informe X/Y/largura/altura em pixels. É possível mostrar o UV original, alterar a resolução final e desfazer/refazer com Ctrl+Z/Ctrl+Y. Confirme a região reservada e clique **Confirmar UV e exportar YDD + YTD**. Cancelar mantém a cena.

O retângulo do OBJ substitui os pixels daquela região por cinza e recebe as ilhas triangulares para pintura. Escolha uma área não usada pela roupa: o editor não detecta automaticamente pixels/ilhas livres. A roupa no mapa inteiro mantém os UVs originais; com resolução igual à imagem original, mantém os pixels fora das áreas reservadas. Não há recuperação de detalhes já perdidos em uma exportação anterior: reabra o YDD/YTD originais. Os mapas auxiliares continuam limitados a 2048; a diffuse vai até 4096. Dois OBJ não podem ocupar o mesmo retângulo; o mesmo vale para duas imagens diferentes da roupa. É ajuste de área por parte OBJ, sem edição individual de vértices UV nem unwrap artístico. O botão Distribuição automática anterior restaura o empacotamento legado; ele pode reduzir a área da roupa.

## Pack de roupas · Collection Studio (0.8.0)

- **Projeto:** Novo, Abrir/Salvar `.godoypack` com todos os arquivos, recuperação de autosave local e histórico Ctrl+Z/Ctrl+Y. O ZIP de recurso FiveM e o projeto editável são formatos separados.
- **Organização:** componentes e 13 categorias de props, masculino/feminino no mesmo projeto, nomes de exibição, grupos/tags, busca/filtro, duplicar/remover/reordenar peças. Arquivos com mesmos nomes podem existir em gêneros diferentes. Nomear uma peça como feminina não converte sua malha/rig.
- **Variações:** miniaturas, adicionar ou associar um YTD já importado, substituir, duplicar para criar uma pintura, renomear/reordenar/remover, exportar YTD/PNG. **Pintar variação** abre a cópia no editor; **Exportar YTD** atualiza somente sua identidade no pack. Para usar uma imagem nova, crie a variação e importe PNG/JPG no editor de pintura. Formatos que o editor não consegue gravar devem ser convertidos antes.
- **Preview:** vestir uma peça por slot e várias categorias ao mesmo tempo, alternar variações, enquadrar, wireframe e ped visível/oculto. Carregar ped via CodeWalker no portable ou importar YDD/GLB autorizado. Peds separados por gênero; o corpo carregado do GTA usa material neutro. Preview estático, sem simular animação, salto, redução de cabelo ou física.
- **Exportação:** aceita índices de entrada com lacunas; reindexa nomes externos sem reescrever geometrias/UV/texturas; gera um ZIP com `fxmanifest.lua`, META/YMT e pastas por gênero/componente. Props usam prefixo `mp_*_freemode_01_p_[coleção]` e âncoras/variações próprias no YMT. Divide coleções grandes automaticamente. O relatório preserva o vínculo entre nome de exibição, índice final, grupo, tags e variações.
- **Configuração:** vínculo `_u/uni` ou `_r/whi`, flags, áudio e metadados de salto/cabelo. Props exigem assets próprios com ancoragem/rig compatíveis; classificá-los não corrige atravessamento, pesos ou recorte da roupa automaticamente. O preview não substitui a validação no FiveM.

A referência funcional e as diferenças restantes estão em [grzyClothTool-reference.md](docs/grzyClothTool-reference.md). A geração de metadados foi conferida pelo leitor independente CodeWalker, incluindo estruturas, campos, enums, âncoras e variações. Rodar `npm run test:pack:browser` exercita projeto, variação independente, pintura e exportação no navegador.


## 05 · Converter OBJ / GLB em YDD

1. Abra a aba 05 e carregue o ped masculino/feminino pelo CodeWalker. Um ped YDD local com esqueleto também pode ser utilizado; GLB serve apenas como referência visual.
2. Importe o OBJ, escolha o osso e clique **Levar OBJ ao osso**. Ajuste posição, giro e escala com os controles 3D; Ctrl+Z/Ctrl+Y desfaz/refaz o posicionamento.
3. Escolha componente/índice. Mantenha o UV do OBJ para usar sua imagem original ou gere um novo UV, com ilhas de triângulos separadas. A geração não é um unwrap artístico por regiões.
4. Escolha a resolução (512–4096) e uma cor ou imagem PNG/JPG/WebP. Uma única diffuse é aplicada a todas as partes; arquivos MTL e múltiplas imagens por material não são importados.
5. **Converter e exportar YDD + YTD** cria um ZIP com a peça nova, dicionário de textura com mipmaps completos, PNG da textura, guia UV e informações do osso. Abra YDD + YTD em Pintura de roupas ou importe-os em Pack de roupas para gerar o recurso FiveM.

O YDD contém somente o OBJ, com o esqueleto do ped e peso de 100% no osso escolhido; a geometria do corpo não é incluída. LOD alto e baixo usam a mesma malha; não há simplificação automática, física nem pesos deformáveis por múltiplos ossos. O módulo 05 não impõe teto fixo de tamanho de OBJ, vértices totais ou 32 partes. Importação e preparo ocorrem em workers com cancelamento; o limite prático depende da memória disponível. Geometrias são divididas automaticamente para índices de 16 bits e vértices idênticos são reutilizados sem remover faces ou alterar UVs/normais. A exportação usa transferência binária temporária, eliminando o teto de JSON de 32 MB. Permanecem o endereçamento/contadores do YDD e o orçamento de leitura de 256 MB de páginas RSC7; excedê-los exige otimizar ou separar recursos. Imagens até 20 MB/16 megapixels. A aparência e o acompanhamento das animações devem ser conferidos no FiveM Legacy com os assets reais.


Na 0.11.1, o mapa UV da interface usa uma amostra de linhas em malhas densas para manter a navegação fluida. A geometria e o UV exportados continuam completos. Guias UV de até 100 mil faces saem em PNG; acima disso, saem em SVG completo, sem rasterizar milhões de linhas na interface. A textura diffuse continua em PNG e YTD. Vértices com diferenças de UV ou normal não são unidos pela compactação. Os módulos 01–04 mantêm seus limites existentes.


### GLB com cores, imagens e peças independentes (0.11.1)

Importe um GLB estático com as imagens PNG/JPEG/WebP embutidas. O modo **Atlas dos materiais** lê imagens e fatores de cor base, separa componentes físicos desconectados e os distribui em áreas UV próprias. Peças de cor uniforme recebem UVs novos, sem sobreposição. O atlas recomenda resolução de até 4096 para preservar a densidade das imagens; reduzir a resolução pode perder detalhe. O YDD e o YTD anteriores não ganham essa correção automaticamente: reimporte o GLB e exporte um par novo.

O modo **Isolar cada triângulo** também remove compartilhamentos dentro de peças texturizadas, transferindo suas cores para ilhas separadas; pode reduzir bastante a definição de texturas. O padrão preserva o mapeamento das imagens dentro de cada componente. Na pintura, **Proteger outras peças na pintura 3D** limita o pincel à região UV da geometria atingida e interrompe a interpolação quando muda de geometria. No mapa 2D, a edição continua livre.

Exportação mantém uma diffuse única no YTD, com PNG, guia UV e relatório das áreas em conversao.json. O shader atual não recria normal maps, metalness, roughness, transmissão ou reflexos PBR do site. GLB com recursos externos, Draco/KTX2 sem decodificador, skin/morph ou cores por vértice deve ser convertido antes para um GLB estático com imagens incluídas. Arquivos OBJ continuam disponíveis, sem leitura automática de MTL.

Na pintura de roupas, o texto permite espelhamento horizontal/vertical. O pincel oferece cor lisa, couro, ripstop e tecido com cor, escala e intensidade ajustáveis. Os padrões são efeitos de cor gravados no PNG/YTD, sem relevo geométrico.
