# Godoy 3D Modding · 0.2.3 beta

Studio local de roupas, malhas e pinturas de veículos para GTA V Legacy/FiveM. Developed by Gabriel Godoy.

## Windows 10/11 x64 portable

Os downloads são publicados em [GitHub Releases](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/releases). O workflow [Windows portable release](https://github.com/gabrielgfernandes1998-oss/Godoy-3D-Modding/actions/workflows/portable-release.yml) compila e publica o ZIP e o SHA-256 quando uma tag `v` correspondente à versão do `package.json` é enviada.

Extraia **todo o ZIP** `Godoy-3D-Modding-0.2.3-Windows-x64-Portable.zip` e execute `Godoy3DModding.exe`. Não precisa instalar Node.js, Python ou .NET no computador de uso. Requer driver com suporte a WebGL. O executável não é assinado digitalmente.

Os arquivos são processados localmente. Salve seus projetos em uma pasta escolhida por você; não há salvamento automático. O pacote não inclui arquivos originais GTA, ped base ou modelos comerciais.

## Recursos desta versão

| Módulo | Disponível | Limites |
| --- | --- | --- |
| Pack de roupas | Nome, gênero, associação por componente/índice, geração YMT binário e SHOP_PED_APPAREL_META_FILE, fxmanifest, ZIP com stream/[male ou female]/componente | Geração YMT experimental; exige índices contínuos desde 000, variantes _u/uni ou _r/whi. Sem props ou variantes de primeira pessoa. |
| Pintura de roupas | YDD/YTD, seleção de drawables/LODs, pintura 3D/UV, camadas, texto, imagem, exportação YTD e texturas embutidas | Baseada no PAINTFIVE; não recompila alterações de geometria. |
| Associação de arquivos | Importação de conjunto, busca por nome e referências de materiais; escolha manual em caso de empate | Só acessa arquivos selecionados pelo usuário. |
| Integração editor/pack | Exportar YTD no editor atualiza o conjunto do pack com o nome original e o YDD aberto | O nome precisa seguir a convenção de componentes para gerar o recurso. |
| Malhas e objetos | Peça inteira sobre o ped; posição/rotação/escala gravadas no YDD original; preservar pesos ou prender rigidamente à pelve/cabeça/tronco; desfazer/refazer; GLB e união OBJ nas opções avançadas | Incorpora OBJ num atlas único de roupa + acessório e UV automático em ilhas triangulares, herdando pesos da região próxima. Sem YFT, unwrap artístico, pintura manual de pesos, animação ou colisão. Layouts incompatíveis são recusados. Teste FiveM real pendente. |
| Pintura de veículos | YFT e _hi.yft visualizáveis, seleção de drawables/LODs, materiais e pintura YTD | Baseada no Godoy-Paint-Car. Não reconstrói bones/fragment physics/damage nem gera novo _hi.yft. |

Não é a implementação completa dos três módulos originais. A exportação nativa de geometria e a validação em FiveM continuam pendentes. O workflow exige um teste do executável em Windows antes de publicar. Consulte [estado da versão](docs/release-status.md).

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

3. Os índices de cada componente começam em 000, sem lacunas, e as texturas começam em `a`. Arquivos com prefixo `colecao^` também são aceitos. O índice é preservado; não há renumeração arbitrária de nomes internos.
4. Gere o ZIP. Ele inclui `fxmanifest.lua`, `mp_m_freemode_01_nome.meta` (ou feminino), YMT e os YDD/YTD organizados em `stream/[male]/jbib/`, etc. O `dlcName` no META e o hash interno do YMT usam o nome da coleção; `fullDlcName` inclui o ped.
5. Extraia como um recurso na base, adicione `ensure nome_do_recurso` e confira **no servidor FiveM Legacy** antes de distribuir. O `export-report.json` registra componentes e referências externas de textura; referências não resolvidas precisam ser conferidas.

O gerador de YMT cria um recurso RSC7 v2 CPedVariationInfo. Sua estrutura foi lida por um leitor independente CodeWalker; isso não substitui testar os arquivos no jogo. YDD/YTD são analisados e copiados, sem alterar seus bytes. Limites: 80 MB por arquivo, 256 MB por pack, 1–128 drawables e no máximo 255 texturas por componente, até 26 variações por drawable.

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
