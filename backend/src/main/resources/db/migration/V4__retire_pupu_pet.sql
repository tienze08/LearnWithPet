UPDATE pets SET species = 'CAT' WHERE species = 'PUPU';
DELETE FROM pet_unlocks WHERE species = 'PUPU';

ALTER TABLE pets MODIFY COLUMN species ENUM('BUNNY', 'CAT', 'DRAGON', 'FOX', 'PANDA');
ALTER TABLE pet_unlocks MODIFY COLUMN species ENUM('BUNNY', 'CAT', 'DRAGON', 'FOX', 'PANDA');
