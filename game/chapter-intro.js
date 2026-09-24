export const CHAPTER_INTROS = {
  5: { image: '/assets/intros/montjoie.png', title: 'Montjoie', text: 'À Montjoie, Jualos a toujours du com\'com à vendre. Son territoire. Son ego. Et surtout… la carotte qu\'il va essayer de te mettre.' },
  4: { image: '/assets/intros/cap-saran.png', title: 'Cap Saran', text: 'À Cap Saran, les magasins ferment, mais Jo fait des heures supplémentaires. Sa spécialité : les livraisons express. Directement dans les dents.' },
  3: { image: '/assets/intros/allee-guignace.png', title: 'Allée de la Guignace', text: 'Allée de la Guignace, ca deal du shit. Si tu veux passer chez Rosiers, Lorenzo t\'attend avec Triolo … et il commence sérieusement à s’impatienter.' },
  0: { image: '/assets/intros/chene-maillard.png', text: 'Au Chêne Maillard, Karonux se croit le maître des rues. Mais les temps sont durs… et ici, la loi est impitoyable.' },
  1: { image: '/assets/intros/chateau-etang.png', text: 'Au Château de l’Étang, Kikor peint des jours meilleurs. Le problème, c’est que ses mauvaises idées commencent à sortir du cadre.' },
  2: { image: '/assets/intros/stade-colette-besson.png', text: 'Au stade Colette Besson, Yanu ne joue plus pour gagner. Il joue pour qu’on se souvienne de lui. Ce soir, il nous met la lumière avec ses soirée fluo.' },
};
export const INTRO_REVEAL = 8;
export const INTRO_DURATION = 14;
export const hasChapterIntro = state => state.phase === 'intro' && !!CHAPTER_INTROS[state.chapter] && state.stage === 0 && state.chapterStory === true && !state.practice;
