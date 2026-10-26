# Godoy 3D Modding 0.9.2 beta

- Remove do módulo 05 os bloqueios de 20 MB por OBJ, 500 mil vértices, 32 partes e 32 MB de geometria serializada. Importação e preparo da geometria ocorrem em workers, com progresso e cancelamento; a cena anterior é preservada ao cancelar.
- Geometria segue em arrays tipados e arquivo binário temporário para o CodeWalker, sem expandir milhões de números em JSON. Arquivos temporários são removidos ao terminar ou falhar.
- Reutiliza vértices exatamente idênticos em posição/normal/UV, preservando todas as faces e as diferenças de normal/UV nas costuras. A divisão interna em partes de 16 bits continua automática.
- Prévia UV de malhas densas desenha uma amostra de linhas. O guia exportado é completo: PNG para malhas menores e SVG acima de 100 mil triângulos. Textura PNG/YTD e geometria não são simplificadas.
- Testado localmente com os dois OBJ enviados: chaveiro de 48.202.369 bytes/491.620 triângulos e iPhone de 13.648.464 bytes/237.271 triângulos. Ambos importaram e geraram YDD/YTD; nenhuma face foi removida. Chaveiro com 23 partes/280.658 vértices armazenados após compactação; iPhone com 50 partes/711.813 vértices.
- Regressão do portable Windows importa OBJ acima de 20 MB e 600 mil vértices, cancela/reimporta, converte pela ponte real e confere todos os triângulos e o guia SVG. Testes nativos verificam transporte binário e mais de 32 geometrias.

Não é capacidade literalmente infinita: a memória disponível, os campos de 16/28 bits do formato e o orçamento de leitura de 256 MB de páginas RSC7 continuam válidos. Se um recurso exceder esses limites, a ferramenta informa o motivo; não corta geometria para fazê-lo caber. Os testes com OBJ reais usaram um ped de teste; aparência/animação no FiveM não foi validada. O ZIP do chaveiro não inclui imagens. A conversão continua usando uma diffuse selecionada/cor base; não reconstitui materiais MTL automaticamente. Outros módulos mantêm suas restrições existentes.
