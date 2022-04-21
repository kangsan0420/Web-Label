CREATE TABLE images (
    id    INT    NOT NULL AUTO_INCREMENT, 
    fname    VARCHAR(16)    NOT NULL, 
    label    VARCHAR(16), 
PRIMARY KEY(id)
);

CREATE TABLE labels (
    id    INT    NOT NULL AUTO_INCREMENT, 
    name VARCHAR(64)
PRIMARY KEY(id)
);

INSERT INTO labels (name) values ('cat');
INSERT INTO labels (name) values ('dog');
commit;