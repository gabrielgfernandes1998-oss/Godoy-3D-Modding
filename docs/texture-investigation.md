# Investigação: mochila branca / objeto preto no grzyClothTool

Estado: caso real ainda não reproduzido; aguardando o par YDD/YTD original e o par exportado. O usuário confirmou que a imagem vem do grzyClothTool, não de uma execução FiveM.

## Evidência no preview

Revisado upstream grzyClothTool no commit `6b118754e332414e7026b694b7559bfff56984a4`:

- `grzyClothTool/Helpers/CWHelper.cs`, CreateYtdFile: lê o YTD completo para preview.
- `CodeWalker/CodeWalker/CustomPedsForm.cs`, RenderSelectedItem: passa `t.Textures.data_items[0]` como diffOverride e shouldOverride=true.
- `CodeWalker/CodeWalker/Rendering/Renderer.cs`: quando o sampler é DiffuseSampler e LiveTextureEnabled=false, substitui a textura de cada geometria pelo diffOverride.

Assim, o preview aplica a primeira textura do dicionário às diversas geometrias em vez de usar exclusivamente suas referências independentes. A ordenação por hash usada pelo nosso exportador pode colocar um mapa auxiliar antes da diffuse original. O fato de um YTD aceitar várias entradas não demonstra que o fluxo de roupas desse preview ou do jogo resolva múltiplas diffuses independentes. A validação anterior no editor Godoy exercitava a associação por nome e não reproduzia essa substituição.

## Correção independente já testada no código

O exportador trocava todos os samplers do shader copiado por mapas neutros. Agora altera somente diffuse/normal/specular reconhecidos; preserva slots específicos de paleta, máscara, detalhe e ambiente. Teste nativo verifica o sampler de paleta original e o copiado após serialização/reabertura em todos os LODs. Essa alteração ainda não é uma correção visual comprovada da mochila branca e não foi publicada em uma nova release portable.

## Próximo passo dependente dos arquivos

Comparar as referências, a ordem/hashes do dicionário e os mapas originais com os arquivos exportados. Preparar um atlas comum da diffuse para roupa e OBJ, atualizar UVs e preservar a correspondência dos mapas auxiliares. Não remapear UVs cegamente: shaders podem usar texturas auxiliares externas/embutidas, UVs fora de 0–1 ou múltiplos canais. É necessário validar no modelo real antes de anunciar compatibilidade.

Arquivos necessários: YDD original + YTD original; YDD exportado + YTD exportado que geraram o problema, preferencialmente os bytes usados no grzy, sem nova conversão/otimização. O OBJ original é útil se disponível.
