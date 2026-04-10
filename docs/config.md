# Config Protocol

## Table of Contents

* [1. Overview](#1-overview)
* [2. Structure](#2-structure)
* [3. Field Definitions](#3-field-definitions)
* [4. Naming Conventions](#4-naming-conventions)
* [5. Rules](#5-rules)
* [6. Validation](#6-validation)
* [7. Usage](#7-usage)
* [8. Common Pitfalls](#8-common-pitfalls)

---

## 1. Overview

Config layer stores **only input data required by services**.

It must:

* Be predictable
* Be validated at startup
* Contain no logic

---

## 2. Structure

All configuration must follow:

```json
{
  "services": {
    "<service_name>": {
      "account": {},
      "options": {},
      "meta": {}
    }
  }
}
```

---

## 3. Field Definitions

### 3.1 account (Required)

Represents the identity used by the service.

Allowed fields:

| Field    | Type   | Description            |
| -------- | ------ | ---------------------- |
| username | string | Public identifier      |
| id       | string | Internal / platform ID |

---

### 3.2 options (Optional)

Used for flags and simple configuration.

Allowed types:

* boolean
* string[]

Example:

```json
{
  "show_dialog": false,
  "scopes": ["user-read"]
}
```

---

### 3.3 meta (Optional)

Used for structured service-specific data.

Example:

```json
{
  "routes": {
    "profile": "v1-get-public-profile"
  }
}
```

---

## 4. Naming Conventions

### 4.1 Service Names

* lowercase only
* no spaces

Examples:

* `github`
* `leetcode`

---

### 4.2 Standard Fields

Use only these keys:

| Purpose   | Key      |
| --------- | -------- |
| user name | username |
| user id   | id       |

---

### 4.3 Forbidden Names

Do NOT use:

* `user`
* `name`
* `userid`
* `userId`

---

## 5. Rules

### 5.1 No Logic

Config must NOT contain:

* endpoints
* URLs for APIs
* computed values
* fallback values

---

### 5.2 Strict Structure

* No mixing levels
* No custom root keys inside service

---

### 5.3 Service Isolation

Each service receives only its config slice:

```js
Service(config.services.<name>)
```

---

### 5.4 Deterministic Input

Config must be:

* complete
* valid
* explicit

---

## 6. Validation

Config must be validated at startup.

Invalid config must:

* throw error
* stop application

Validation checks:

* required fields exist
* types are correct
* no unexpected structures

---

## 7. Usage

Example:

```js
LeetcodeProfileData(config.services.leetcode)
```

---

## 8. Common Pitfalls

### ❌ Invalid structure

```json
{
  "username": "akki"
}
```

---

### ❌ Wrong naming

```json
{
  "user": "akki"
}
```

---

### ❌ Logic in config

```json
{
  "endpoint": "https://..."
}
```
