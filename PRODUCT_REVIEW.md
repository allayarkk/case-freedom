# 🔍 Product Review — Case Freedom (FIRE Engine)

> Последнее обновление: 21 февраля 2026  
> Роль: Product Owner

---

## ✅ Реализовано

### Бэкенд — Core Business Logic

| # | Фича | Статус |
|---|-------|--------|
| 1 | **Escalation Matrix** — тип обращения → мин. должность (SPECIALIST < SENIOR < LEAD) | ✅ |
| 2 | **Эскалация по тональности** — NEGATIVE + P8+ → минимум SENIOR_SPECIALIST | ✅ |
| 3 | **VIP эскалация** — VIP + NEGATIVE → SENIOR_SPECIALIST+ | ✅ |
| 4 | **Dynamic Round Robin** — пересортировка менеджеров после каждого назначения | ✅ |
| 5 | **Зарубежные клиенты** — country ≠ KZ → Астана/Алматы по нагрузке | ✅ |
| 6 | **Обработка пустого описания** — default analysis + summary для менеджера | ✅ |
| 7 | **Vision AI** — если attachment = URL изображения → gpt-4o-mini vision | ✅ |
| 8 | **Ticket close endpoint** — PATCH /tickets/:id/close (activeTicketCount -1) | ✅ |
| 9 | **Single ticket endpoint** — POST /tickets | ✅ |
| 10 | **Explainable routing** — полный reason string в AssignmentLog | ✅ |
| 11 | **AI response validation** — нормализация типов, приоритетов, языков | ✅ |
| 12 | **Fallback 50/50 по нагрузке** — при ошибке геокодинга выбор офиса по load | ✅ |

### Фронтенд

| # | Фича | Статус |
|---|-------|--------|
| 1 | **TicketDetail — explainable routing** — каждый шаг маркрутизации отображается | ✅ |
| 2 | **Managers — рабочая кнопка "Добавить"** — модал с CSV импортом + file picker | ✅ |
| 3 | **Удалены нерабочие кнопки** — "Новое обращение", "Быстрое добавление", "Фильтры" | ✅ |
| 4 | **Skills badges** — на карточках менеджеров видны навыки | ✅ |
| 5 | **Должность менеджера** — в TicketDetail отображается позиция | ✅ |
| 6 | **История назначений** — в TicketDetail видна цепочка AssignmentLog | ✅ |

---

## 📋 Осталось сделать (опционально)

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | Risk-based priority scoring (VIP boost, fraud=10) | 🟡 По желанию |
| 2 | Keyword validation для типа/тональности | 🟡 По желанию |
| 3 | LLM-based address normalization при низком confidence | 🟢 Бонус |
| 4 | Batch сортировка по priority DESC | 🟢 Бонус |
| 5 | Live демо batch import с прогрессом на Dashboard | 🟢 Бонус |

---

## 🏗️ Архитектура маршрутизации (FIRE Cascade)

```
1. AI Анализ (gpt-4o-mini)
   ├── Text mode: описание → тип, тональность, приоритет, язык
   └── Vision mode: описание + вложение-URL → анализ изображения
   
2. Geocoding (Nominatim)
   ├── Адрес → координаты
   └── Fallback: null → 50/50 Астана/Алматы по нагрузке

3. Escalation Matrix
   ├── FRAUD → LEAD_SPECIALIST
   ├── CLAIM → SENIOR_SPECIALIST
   ├── DATA_CHANGE → SENIOR_SPECIALIST
   └── NEGATIVE + P8+ → SENIOR_SPECIALIST+

4. Routing Cascade
   ├── Step 1: Определение офиса (гео / зарубежный / fallback)
   ├── Step 2: Фильтр по навыкам (VIP, KZ, ENG)
   ├── Step 3: Фильтр по должности (escalation)
   └── Step 4: Dynamic Round Robin (top-2, чередование)

5. Assignment
   └── AssignmentLog с полным reason string
```
