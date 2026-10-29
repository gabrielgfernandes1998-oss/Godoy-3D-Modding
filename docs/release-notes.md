# Godoy 3D Modding 0.11.10 beta

- Corrige o vínculo animado do conversor: os vértices agora recebem o índice global do osso escolhido, com tabela completa de ossos e contagem de matrizes correspondente ao esqueleto. Antes, a escolha mudava uma tabela local de um osso, enquanto os vértices continuavam com índice zero. O perfil padrão de roupas de ped usa a tabela completa e índices do esqueleto.
- A troca de pelve para tórax é verificada no arquivo binário exportado, incluindo todos os vértices. O resultado mostra Osso gravado, nome/ID, índice e peso 100%; conversao.json registra o vínculo lido do YDD e o perfil skeleton-global.
- Compactar YDD já exportado reconhece e repara conversões antigas do Godoy com esse perfil local rígido. Recupera o osso indicado na tabela antiga; preserva posições, escala, normais, UVs, cores, pesos, triângulos, material e referência ao YTD. Atualiza os índices e a representação da tabela de ossos. Arquivos de terceiros com outro perfil não recebem essa migração.
- O vínculo rígido nas exportações da aba 03 também usa índices globais e tabela completa. Preservar pesos continua preservando o rig original.
- Mantém as correções de visibilidade, contagens de LOD, material, cabeçalhos de buffers e orçamento de memória das versões anteriores.

Na cópia anterior da mochila, um caso privado reproduziu a seleção de Spine2: 128 ossos/matrizes e índice global 37 (tag 24817) em todos os vértices dos dois LODs. O resultado tem 58.363.841 bytes e reserva de sistema de 88.080.384 bytes. O reparo preservou todos os atributos fora dos índices de osso e todos os triângulos. Nenhum asset do usuário foi publicado.

Extraia o portable completo em uma pasta nova. Você pode reconverter com Tórax / peito — SKEL_Spine2 (24817), ou usar 03/05 → Compactar YDD já exportado no arquivo que já foi exportado com esse osso. Substitua o YDD no recurso usando o YTD correspondente, reinicie o recurso e reconecte antes de testar.

O teste de pose é uma simulação CPU com índices globais, não a execução do motor GTA. A correção do movimento no FiveM precisa ser confirmada pelo usuário. A malha continua rígida em um osso: mochila/alças e cinturão ainda se movem juntos; dividir os pesos por região é uma função separada.
