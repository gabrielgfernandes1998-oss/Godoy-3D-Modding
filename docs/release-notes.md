# Godoy 3D Modding 0.11.5 beta

- Corrige a duplicação dos buffers idênticos de High/Low na conversão OBJ/GLB para YDD. Mantém todos os triângulos, UVs, posição, escala, cores e vínculo ao osso. O YTD não é reduzido nem recomprimido.
- Adiciona **Compactar YDD já exportado** nas abas 03/05. Escolha seu YDD antigo, extraia o ZIP resultante e use o YTD original. O relatório compara tamanho do arquivo e memória reservada.
- Verifica o tamanho reservado pelo RSC7 e bloqueia a exportação/importação no Pack acima do orçamento conservador de 100 MB por região ou arquivo. Se compartilhar buffers não bastar, é necessário reduzir a geometria na origem.
- Mantém a edição de posição e atlas compatível com buffers compartilhados, aplicando cada transformação uma única vez.

Validação local: 88 testes JavaScript, navegador completo e testes nativos. Um recurso sintético com 400 mil triângulos por LOD caiu de 128 para 64 MiB reservados, sem remover geometria. No YDD do chaveiro fornecido, o arquivo caiu de 18.995.494 para 9.584.219 bytes, com região de sistema de 64 para 32 MiB. A mochila de 114.908 KB ainda precisa ser testada pelo usuário, assim como a renderização no FiveM.

Extraia o portable completo numa pasta nova. Novas conversões usam a otimização automaticamente; para arquivos já gerados, use o compactador. LODs completos continuam tendo o mesmo custo de renderização; esta versão reduz armazenamento duplicado, sem simplificação.
