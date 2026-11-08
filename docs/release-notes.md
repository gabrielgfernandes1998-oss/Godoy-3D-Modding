# Godoy 3D Modding 0.11.14 beta

- **02 · Pintura de roupas:** novo botão **Ajustar cor da seleção UV**. Selecione uma ilha no 3D ou no mapa UV e altere a cor preservando desenhos, textura, luz e sombra.
- Controles de cor, intensidade, saturação, brilho e contraste. Desative Colorir para ajustar apenas saturação/brilho/contraste. A caixa Prévia permite comparar antes de aplicar; Cancelar restaura o resultado anterior.
- O efeito é uma camada de ajuste mascarada, aplicada ao conjunto de camadas abaixo. A textura base permanece intacta. É possível ocultar, duplicar, reordenar, ajustar opacidade, desfazer/refazer e usar **Editar ajuste** para alterar os valores depois.
- A máscara UV fica gravada na camada: limpar a seleção atual não amplia o efeito para outras partes da textura. Projetos .godoycloth guardam o ajuste e a máscara; exportações PNG/YTD incluem o resultado composto.
- A seleção é obrigatória. O novo diálogo mostra a prévia no mapa/modelo, bloqueia os atalhos do pincel durante o ajuste e exige aplicar/cancelar antes de salvar/exportar. A troca de documento cancela a prévia temporária.
- Mantém os recursos anteriores de GLB + YDD, atlas, ossos e exportação FiveM.

Como usar: **02 → Ilha UV (U) → clique na área → Ajustar cor da seleção UV → escolha a cor e ajuste Brilho/Contraste → Aplicar ajuste**. Para escurecer ou clarear use Brilho: a escolha de cor preserva a luminosidade dos detalhes. Para editar depois, selecione a camada Ajuste de cor UV e clique Editar ajuste.

O efeito atua na textura diffuse/base color; não altera a malha nem cria mapas de relevo. Testes com desenho claro/escuro verificam o detalhe, transparência, máscara e exportação YTD. A aparência final com a iluminação do jogo deve ser conferida no FiveM.
