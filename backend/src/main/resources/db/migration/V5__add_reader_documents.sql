CREATE TABLE reader_documents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    extracted_text LONGTEXT NOT NULL,
    basket_json LONGTEXT NULL,
    highlights_json LONGTEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_reader_documents_user (user_id),
    CONSTRAINT fk_reader_documents_user FOREIGN KEY (user_id) REFERENCES users(id)
);
