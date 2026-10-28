# Godoy 3D Modding 0.11.9 beta

- Corrige a contagem de modelos dos LODs nas conversões OBJ/GLB. O preview percorria as listas mesmo com FlagsHigh/FlagsLow zerados; o exportador agora grava 1 para cada LOD presente, separadamente da máscara de renderização.
- Grava o flag de skin e a contagem de matrizes para a palette de um osso. Posição, escala, osso escolhido e pesos são preservados.
- Usa a família e os parâmetros do material ped_default.sps com a declaração de vértices correspondente, incluindo Colour1. A versão anterior misturava a família ped e o arquivo ped_default.sps com um layout incompleto.
- Compactar YDD já exportado também repara contagens zeradas e reconhece o perfil exato das conversões antigas do Godoy para migrar o material/layout. Mantém os bytes dos atributos originais, triângulos, UVs, cores originais, pesos e referência à textura. Adiciona somente o segundo canal de cor neutro. Materiais de terceiros não são substituídos por esse perfil.
- Mantém a correção de cabeçalhos independentes de buffers e o orçamento de 100.000.000 bytes. O parser da saída e a ponte nativa verificam que nenhum LOD com modelos permaneceu com contagem zero.

Na cópia privada anterior da mochila, o reparo produziu um YDD de 58.361.303 bytes e reserva de sistema de 88.080.384 bytes. Comparação de todos os atributos originais, índices e palettes passou nos dois LODs; YTD não alterado. O log FiveM enviado pelo usuário confirma que a coleção mochi / hand / local 0 está registrada e permanece selecionada, mas isso não comprova renderização. A confirmação visual desta correção no jogo depende de novo teste do usuário.

Extraia o portable completo em uma pasta nova. Em 03 ou 05, abra Compactar YDD já exportado e selecione o YDD final da mochila. Substitua somente esse YDD no recurso pelo resultado e mantenha o YTD correspondente. Reinicie o recurso e reconecte ao servidor antes de testar. Conversões novas já recebem o perfil corrigido.
