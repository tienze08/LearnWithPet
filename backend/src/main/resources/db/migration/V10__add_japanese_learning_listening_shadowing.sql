-- Japanese study (Tango, kana), Learning Path, Listening and Shadowing.
-- Idempotent: development databases built earlier by ddl-auto=update already have some of this.

create table if not exists learning_plans (
    id bigint not null auto_increment,
    config_snapshot TEXT,
    created_at datetime(6),
    level enum ('N1','N2','N3','N4','N5') not null,
    pace_from date,
    path_id varchar(64) not null,
    start_date date not null,
    status enum ('ACTIVE','COMPLETED','PAUSED') not null,
    target_date date not null,
    user_id bigint not null,
    primary key (id),
    key IDX576pd7v7fae8jy6vkdpenqyv6 (user_id, status),
    constraint FKmqt1xj1chypt3o8wsi2oanf2b foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists daily_plans (
    id bigint not null auto_increment,
    blocks_json TEXT not null,
    completed_at datetime(6),
    created_at datetime(6),
    estimated_minutes integer not null,
    local_date date not null,
    version bigint not null,
    plan_id bigint not null,
    primary key (id),
    constraint UK6jx9efb3w0nsactacadedhivm unique (plan_id, local_date),
    constraint FKlxl5q4lah0vn2ac2sai1rja4b foreign key (plan_id) references learning_plans (id)
) engine=InnoDB;

create table if not exists item_progress (
    id bigint not null auto_increment,
    answer_streak integer default 0 not null,
    correct_count integer not null,
    item_id varchar(64) not null,
    item_type varchar(16) not null,
    last_reviewed_at datetime(6),
    mastery_state enum ('LEARNING','MASTERED','MEMORIZED','NOT_STARTED','UNDERSTOOD') not null,
    next_review_at datetime(6),
    provisional bit not null,
    srs_stage integer not null,
    version bigint not null,
    weak bit default false not null,
    wrong_count integer not null,
    user_id bigint not null,
    primary key (id),
    key IDXmwvwy47duvixjm51j24jyr703 (user_id, next_review_at),
    constraint UK8shqp6aknd3dhaiixq10yah1i unique (user_id, item_type, item_id),
    constraint FKt35md43qhku3sm9ofhq450yxw foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists kana_attempts (
    id bigint not null auto_increment,
    client_attempt_id varchar(255),
    completed_at datetime(6) not null,
    duration_seconds integer,
    score integer not null,
    script varchar(255) not null,
    section varchar(255) not null,
    total integer not null,
    user_id bigint not null,
    primary key (id),
    constraint UKbamxhngft5r4t7k7eshbc4rpi unique (client_attempt_id),
    constraint FKainhp3l3trhukll1dytaho0ol foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists kana_item_progress (
    id bigint not null auto_increment,
    answer_streak integer default 0 not null,
    correct_count integer not null,
    kana varchar(255) not null,
    last_seen_at datetime(6),
    mastered bit not null,
    next_review_at datetime(6),
    script varchar(255) not null,
    section varchar(255) not null,
    srs_stage integer default 0 not null,
    weak bit default false not null,
    wrong_count integer not null,
    user_id bigint not null,
    primary key (id),
    constraint UK3k2vxs1gatg6cdc5pq7vs6uwa unique (user_id, script, kana),
    constraint FKgv37u9sb3qaw7dna5m91kwnh2 foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists learning_sessions (
    id bigint not null auto_increment,
    ended_at datetime(6),
    kind enum ('DAILY','PLACEMENT') not null,
    results_json TEXT,
    started_at datetime(6) not null,
    daily_plan_id bigint,
    user_id bigint not null,
    primary key (id),
    key IDX9t0d1v4h40umsecpupkdkei84 (user_id, started_at),
    constraint FKpx54r3xyhp34dfavc12q92dol foreign key (daily_plan_id) references daily_plans (id),
    constraint FKc0jfn5lt5ifwhwu8mfb5xm92q foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists listening_attempts (
    id bigint not null auto_increment,
    client_attempt_id varchar(64) not null,
    completed_at datetime(6) not null,
    correct_count integer not null,
    duration_seconds integer not null,
    lesson_id varchar(64) not null,
    jlpt_level varchar(2) not null,
    run_mode varchar(8) not null,
    replay_count integer not null,
    total_questions integer not null,
    user_id bigint not null,
    primary key (id),
    constraint UKcif5lu9ggpwtcyh4ebcylcw5f unique (user_id, client_attempt_id),
    constraint FKmgqib5r0f8mr0ebqr1mq79anj foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists listening_answers (
    attempt_id bigint not null,
    is_correct bit not null,
    difficulty varchar(8) not null,
    grammar_ids varchar(2000),
    question_id varchar(100) not null,
    replays integer not null,
    exercise_type varchar(16) not null,
    word_refs varchar(1000),
    position integer not null,
    primary key (attempt_id, position),
    check ((position>=0)),
    constraint FKnxhx2e106myklw92h345tllt3 foreign key (attempt_id) references listening_attempts (id)
) engine=InnoDB;

create table if not exists path_profiles (
    id bigint not null auto_increment,
    created_at datetime(6),
    current_level enum ('BEGINNER','KNOWS_LEVEL','STUDYING') not null,
    days_per_week integer not null,
    goal enum ('BASIC_CONVERSATION','PASS_JLPT','PREPARE_NEXT_LEVEL') not null,
    minutes_per_day integer not null,
    pace varchar(16),
    target_date date not null,
    target_level enum ('N1','N2','N3','N4','N5') not null,
    timezone varchar(64) not null,
    updated_at datetime(6),
    user_id bigint not null,
    primary key (id),
    constraint UK36mpxod045g5cd1umujk1okrg unique (user_id),
    constraint FKdqdqvilwp5qc88tscpmq7bmsm foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists path_tests (
    id bigint not null auto_increment,
    adjustment varchar(16),
    attempt1_score float(53),
    attempt2_score float(53),
    created_at datetime(6),
    final_score float(53),
    finished_at datetime(6),
    kind varchar(16) not null,
    message varchar(300),
    passed bit not null,
    wrong_items_json TEXT,
    daily_plan_id bigint not null,
    user_id bigint not null,
    primary key (id),
    constraint UKps8r90c7ewqb32ulbrov72uc4 unique (daily_plan_id),
    constraint FKtaja17ajlispe23iixyqwwqpo foreign key (daily_plan_id) references daily_plans (id),
    constraint FKcb6uensnxj6gh6dk8qrelan93 foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists question_reports (
    id bigint not null auto_increment,
    comment varchar(500),
    created_at datetime(6),
    item_id varchar(64) not null,
    item_type varchar(16) not null,
    question_json TEXT not null,
    question_kind varchar(32) not null,
    user_id bigint not null,
    primary key (id),
    key IDX12i55bidgljpycct2wp3hiu66 (item_type, item_id),
    constraint FKo0f4frd78clp4g4etvevemfh8 foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists shadowing_sessions (
    id bigint not null auto_increment,
    client_session_id varchar(64) not null,
    completed bit not null,
    completed_at datetime(6) not null,
    duration_seconds integer not null,
    jlpt_level varchar(2) not null,
    practice_mode varchar(12) not null,
    recording_count integer not null,
    sentence_count integer not null,
    unit_id varchar(64) not null,
    user_id bigint not null,
    primary key (id),
    constraint UK4i7uk2dyt83dw0n0q54edygoq unique (user_id, client_session_id),
    constraint FK3h3j3l30wl9fqie02yx8st4b5 foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists shadowing_sentence_results (
    session_id bigint not null,
    content_match integer,
    missed_checks varchar(100),
    passed_checks varchar(100),
    recording_count integer not null,
    sentence_key varchar(100) not null,
    position integer not null,
    primary key (session_id, position),
    check ((position>=0)),
    constraint FKtdlat0rmgn4c37pnr1g6gi9yw foreign key (session_id) references shadowing_sessions (id)
) engine=InnoDB;

create table if not exists tango_lessons (
    id bigint not null auto_increment,
    created_at datetime(6),
    description TEXT,
    jlpt_level enum ('N1','N2','N3','N4','N5') not null,
    lesson_number integer not null,
    published bit not null,
    sort_order integer not null,
    title varchar(120) not null,
    updated_at datetime(6),
    primary key (id),
    constraint UK5i4ttndidrty9fw4cbohgq9kd unique (jlpt_level, lesson_number)
) engine=InnoDB;

create table if not exists tango_vocabularies (
    id bigint not null auto_increment,
    audio_url varchar(255),
    created_at datetime(6),
    expression varchar(64),
    expression_key varchar(64) not null,
    kana varchar(64) not null,
    part_of_speech enum ('ADVERB','COUNTER','EXPRESSION','I_ADJECTIVE','NA_ADJECTIVE','NOUN','OTHER','PARTICLE','VERB_GODAN','VERB_ICHIDAN','VERB_IRREGULAR') not null,
    romaji varchar(64) not null,
    updated_at datetime(6),
    primary key (id),
    constraint UKd53jow69xtdtjx15pms40i6to unique (kana, expression_key)
) engine=InnoDB;

create table if not exists tango_lesson_vocabularies (
    id bigint not null auto_increment,
    position integer not null,
    required bit not null,
    lesson_id bigint not null,
    vocabulary_id bigint not null,
    primary key (id),
    constraint UK4cck8sxgorrds3qm8d54ojy3p unique (lesson_id, vocabulary_id),
    constraint UK8j242orw5mstvomedkq702fd6 unique (lesson_id, position),
    constraint FK5sk7m2dkfji4e8tyea4dwhk3u foreign key (lesson_id) references tango_lessons (id),
    constraint FK6do3ias61s330bio111dvdjp8 foreign key (vocabulary_id) references tango_vocabularies (id)
) engine=InnoDB;

create table if not exists tango_quiz_attempts (
    id bigint not null auto_increment,
    accuracy float(53) not null,
    client_attempt_id varchar(64) not null,
    correct_count integer not null,
    duration_seconds integer,
    incorrect_count integer not null,
    mode enum ('JP_TO_MEANING','MIXED','VI_TO_JP') not null,
    passed bit not null,
    scope enum ('ALL','MISTAKES') not null,
    submitted_at datetime(6) not null,
    total_questions integer not null,
    lesson_id bigint not null,
    user_id bigint not null,
    primary key (id),
    constraint UKabdlx2g6nyhghtxu08f8l4e4g unique (user_id, client_attempt_id),
    constraint FK2ljugpj49kb7g5ybqf3xl9y9g foreign key (lesson_id) references tango_lessons (id),
    constraint FKenykytqhcltvcb2kufd7kxt7t foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists tango_quiz_answers (
    id bigint not null auto_increment,
    is_correct bit not null,
    mode enum ('JP_TO_MEANING','MIXED','VI_TO_JP') not null,
    normalized_answer varchar(255) not null,
    submitted_answer varchar(255) not null,
    attempt_id bigint not null,
    vocabulary_id bigint not null,
    primary key (id),
    constraint UKpkjqd8dl0uwcbtpsrpl0afg4t unique (attempt_id, vocabulary_id),
    constraint FKohnjabecl4gygn3o66bhg5c4g foreign key (attempt_id) references tango_quiz_attempts (id),
    constraint FK3e2g1n0bhgvyycb5oajbhvuq2 foreign key (vocabulary_id) references tango_vocabularies (id)
) engine=InnoDB;

create table if not exists tango_vocabulary_examples (
    id bigint not null auto_increment,
    japanese TEXT not null,
    reading TEXT,
    sort_order integer not null,
    vietnamese TEXT not null,
    vocabulary_id bigint not null,
    primary key (id),
    constraint UKbl31mm8fr2etjgu5lo7fylt5p unique (vocabulary_id, sort_order),
    constraint FK8kcfqwfvqtebdyw4p69pjdvse foreign key (vocabulary_id) references tango_vocabularies (id)
) engine=InnoDB;

create table if not exists tango_vocabulary_meanings (
    id bigint not null auto_increment,
    language varchar(8) not null,
    meaning varchar(255) not null,
    note varchar(255),
    is_primary bit not null,
    sort_order integer not null,
    vocabulary_id bigint not null,
    primary key (id),
    constraint UKemotw8vly4v1q1sqyc1lwjgbf unique (vocabulary_id, language, meaning),
    constraint FKhskcloar285341gxrf8dqa12i foreign key (vocabulary_id) references tango_vocabularies (id)
) engine=InnoDB;

create table if not exists user_tango_favorites (
    id bigint not null auto_increment,
    created_at datetime(6) not null,
    user_id bigint not null,
    vocabulary_id bigint not null,
    primary key (id),
    constraint UKbdqjk7uy19w8wgauhjg8ui01d unique (user_id, vocabulary_id),
    constraint FKliqcgvpnmu5hpqw4ew9afdo4s foreign key (user_id) references users (id),
    constraint FKjxmreubaevwnif2mwyvdersgs foreign key (vocabulary_id) references tango_vocabularies (id)
) engine=InnoDB;

create table if not exists user_tango_lesson_progress (
    id bigint not null auto_increment,
    best_quiz_accuracy float(53),
    completed_at datetime(6),
    last_position integer,
    last_studied_at datetime(6),
    quiz_passed bit not null,
    started_at datetime(6) not null,
    status enum ('COMPLETED','IN_PROGRESS') not null,
    lesson_id bigint not null,
    user_id bigint not null,
    primary key (id),
    constraint UK9ncfrd529qdgjnb25mnglccm3 unique (user_id, lesson_id),
    constraint FKdyrckl3dxhk74g9jeu9il47r9 foreign key (lesson_id) references tango_lessons (id),
    constraint FKnhc5bkdk03w56qh08b87uw8p2 foreign key (user_id) references users (id)
) engine=InnoDB;

create table if not exists user_tango_vocabulary_progress (
    id bigint not null auto_increment,
    answered_count integer not null,
    correct_count integer not null,
    incorrect_count integer not null,
    last_answered_at datetime(6),
    mastered_at datetime(6),
    status enum ('LEARNING','MASTERED','NEED_REVIEW','NEW') not null,
    version bigint not null,
    viewed_at datetime(6),
    user_id bigint not null,
    vocabulary_id bigint not null,
    primary key (id),
    constraint UKija3twxs2gn4ykdlqeeu5vb1l unique (user_id, vocabulary_id),
    constraint FKryed4c3rlcgj8uaunflrerc84 foreign key (user_id) references users (id),
    constraint FKkathcx6htov3p68gfqe5w8o1y foreign key (vocabulary_id) references tango_vocabularies (id)
) engine=InnoDB;

set @ddl = (select if(count(*) = 0, 'alter table user_vocabulary_progress add column answer_streak integer default 0 not null', 'select 1') from information_schema.columns
    where table_schema = database() and table_name = 'user_vocabulary_progress' and column_name = 'answer_streak');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table user_vocabulary_progress add column correct_count integer default 0 not null', 'select 1') from information_schema.columns
    where table_schema = database() and table_name = 'user_vocabulary_progress' and column_name = 'correct_count');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table user_vocabulary_progress add column incorrect_count integer default 0 not null', 'select 1') from information_schema.columns
    where table_schema = database() and table_name = 'user_vocabulary_progress' and column_name = 'incorrect_count');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table user_vocabulary_progress add column last_source enum (''FLASHCARD'',''QUIZ'',''REVIEW'',''TANGO'')', 'select 1') from information_schema.columns
    where table_schema = database() and table_name = 'user_vocabulary_progress' and column_name = 'last_source');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table user_vocabulary_progress add column times_seen integer default 0 not null', 'select 1') from information_schema.columns
    where table_schema = database() and table_name = 'user_vocabulary_progress' and column_name = 'times_seen');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table user_vocabulary_progress add column weak bit default false not null', 'select 1') from information_schema.columns
    where table_schema = database() and table_name = 'user_vocabulary_progress' and column_name = 'weak');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table user_vocabulary_progress add column tango_vocabulary_id bigint', 'select 1') from information_schema.columns
    where table_schema = database() and table_name = 'user_vocabulary_progress' and column_name = 'tango_vocabulary_id');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table vocabularies add column tango_vocabulary_id bigint', 'select 1') from information_schema.columns
    where table_schema = database() and table_name = 'vocabularies' and column_name = 'tango_vocabulary_id');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table user_vocabulary_progress add constraint FK4vqrmtvbqi93vkch0vd5hw1eo foreign key (tango_vocabulary_id) references tango_vocabularies (id)', 'select 1') from information_schema.key_column_usage
    where table_schema = database() and table_name = 'user_vocabulary_progress' and column_name = 'tango_vocabulary_id'
    and referenced_table_name = 'tango_vocabularies');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;

set @ddl = (select if(count(*) = 0, 'alter table vocabularies add constraint FKijbmo0an2h6s0p2xkhps0b4s6 foreign key (tango_vocabulary_id) references tango_vocabularies (id)', 'select 1') from information_schema.key_column_usage
    where table_schema = database() and table_name = 'vocabularies' and column_name = 'tango_vocabulary_id'
    and referenced_table_name = 'tango_vocabularies');
prepare statement from @ddl;
execute statement;
deallocate prepare statement;
