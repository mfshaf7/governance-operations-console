// Generated presentation snapshot; OOS retains semantic authority.
export default {
  "source": "operator-orchestration-service/contracts/delivery-art/delivery-art-architecture-packet.schema.json",
  "sourceSha256": "34232369eb40c96553ac7b94af440991d1a1bfee2dfc253f62405b064a8489b4",
  "authoringVersion": 6,
  "requiredProtocolDimensions": [
    "command-and-acknowledgement-semantics",
    "deterministic-identities-and-idempotency",
    "state-mutation-ordering",
    "retry-cancel-replay-and-recovery-semantics",
    "bounded-failure-mapping",
    "authorization-integrity-and-replay-resistance",
    "session-scenario-and-execution-binding",
    "result-and-owner-receipt-completeness",
    "immutable-baseline-and-restore-evidence",
    "lifecycle-state-matrix",
    "cross-artifact-timeline-ordering",
    "shared-validator-compatibility"
  ],
  "$defs": {
    "nonEmptyString": {
      "type": "string",
      "minLength": 1
    },
    "identifier": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9._:-]*$"
    },
    "landingUnitId": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9._:-]*$"
    },
    "artifactId": {
      "type": "string",
      "pattern": "^architecture-packet:[a-z0-9][a-z0-9._:-]*$"
    },
    "deliveryId": {
      "type": "string",
      "pattern": "^delivery-[1-9][0-9]*$"
    },
    "workItemId": {
      "type": "string",
      "pattern": "^work-item-[1-9][0-9]*$"
    },
    "workItemIds": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/workItemId"
      }
    },
    "landingUnitIds": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/landingUnitId"
      }
    },
    "repoName": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]*$"
    },
    "timestamp": {
      "type": "string",
      "format": "date-time"
    },
    "digest": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$"
    },
    "gitCommit": {
      "type": "string",
      "pattern": "^[0-9a-f]{40}$"
    },
    "nonEmptyStrings": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/nonEmptyString"
      }
    },
    "capabilityIds": {
      "type": "array",
      "minItems": 1,
      "uniqueItems": true,
      "items": {
        "$ref": "#/$defs/identifier"
      }
    },
    "legacyRuntimeBoundary": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "owner_repo",
        "allowed",
        "prohibited"
      ],
      "properties": {
        "owner_repo": {
          "$ref": "#/$defs/repoName"
        },
        "allowed": {
          "$ref": "#/$defs/nonEmptyStrings"
        },
        "prohibited": {
          "$ref": "#/$defs/nonEmptyStrings"
        }
      }
    },
    "capabilityRuntimeBoundary": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "owner_repo",
        "allowed_capability_ids",
        "prohibited_capability_ids"
      ],
      "properties": {
        "owner_repo": {
          "$ref": "#/$defs/repoName"
        },
        "allowed_capability_ids": {
          "$ref": "#/$defs/capabilityIds"
        },
        "prohibited_capability_ids": {
          "$ref": "#/$defs/capabilityIds"
        }
      }
    },
    "legacyRuntimeBoundaries": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/legacyRuntimeBoundary"
      }
    },
    "capabilityRuntimeBoundaries": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/capabilityRuntimeBoundary"
      }
    },
    "artifactRef": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "uri",
        "digest"
      ],
      "properties": {
        "uri": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "digest": {
          "$ref": "#/$defs/digest"
        }
      }
    },
    "artifactUri": {
      "type": "string",
      "pattern": "^wgcf://artifacts/delivery-art/sha256/[0-9a-f]{64}$"
    },
    "custodyReceiptUri": {
      "type": "string",
      "pattern": "^wgcf://receipts/artifact-custody/[0-9a-f]{24}-[0-9a-f]{64}\\.json$"
    },
    "custodyReceiptRef": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "uri",
        "digest"
      ],
      "properties": {
        "uri": {
          "$ref": "#/$defs/custodyReceiptUri"
        },
        "digest": {
          "$ref": "#/$defs/digest"
        }
      }
    },
    "artifactRefs": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/artifactRef"
      }
    },
    "operator": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "decision_source"
      ],
      "properties": {
        "id": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "decision_source": {
          "enum": [
            "operator",
            "approved-ai-suggestion"
          ]
        }
      }
    },
    "repoRevision": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "repo",
        "base_ref",
        "commit"
      ],
      "properties": {
        "repo": {
          "$ref": "#/$defs/repoName"
        },
        "base_ref": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "commit": {
          "$ref": "#/$defs/gitCommit"
        }
      }
    },
    "sourceSnapshot": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "captured_at",
        "art_ref",
        "art_digest",
        "repo_revisions"
      ],
      "properties": {
        "captured_at": {
          "$ref": "#/$defs/timestamp"
        },
        "art_ref": {
          "type": "string",
          "pattern": "^openproject://work_packages/[1-9][0-9]*$"
        },
        "art_digest": {
          "$ref": "#/$defs/digest"
        },
        "repo_revisions": {
          "type": "array",
          "minItems": 1,
          "items": {
            "$ref": "#/$defs/repoRevision"
          }
        }
      }
    },
    "fidelity": {
      "enum": [
        "pure-unit",
        "filesystem",
        "real-git",
        "process-crash",
        "sandbox-runtime",
        "live-backend"
      ]
    },
    "integrity": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "canonicalization",
        "algorithm",
        "content_digest"
      ],
      "properties": {
        "canonicalization": {
          "const": "RFC8785"
        },
        "algorithm": {
          "const": "sha256"
        },
        "content_digest": {
          "$ref": "#/$defs/digest"
        }
      }
    },
    "custody": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "state",
        "backend",
        "uri",
        "receipt_ref",
        "persisted_at",
        "supersedes"
      ],
      "properties": {
        "state": {
          "enum": [
            "local-draft",
            "durable"
          ]
        },
        "backend": {
          "enum": [
            "local-filesystem",
            "wgcf-artifact-registry"
          ]
        },
        "uri": {
          "$ref": "#/$defs/nonEmptyString"
        },
        "receipt_ref": {
          "oneOf": [
            {
              "$ref": "#/$defs/custodyReceiptRef"
            },
            {
              "type": "null"
            }
          ]
        },
        "persisted_at": {
          "oneOf": [
            {
              "$ref": "#/$defs/timestamp"
            },
            {
              "type": "null"
            }
          ]
        },
        "supersedes": {
          "oneOf": [
            {
              "$ref": "#/$defs/artifactRef"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    }
  },
  "properties": {
    "architecture": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "descendant_owner_map",
        "lifecycle_state_model",
        "authorization_session_execution_model",
        "evidence_receipt_handoffs",
        "runtime_boundaries",
        "rollback_cleanup_terminal_conditions",
        "contradictions_open_decisions",
        "work_item_execution_plan",
        "landing_units",
        "source_landing_graph",
        "required_human_gates",
        "runtime_activation_chains"
      ],
      "properties": {
        "descendant_owner_map": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "work_item_id",
              "work_item_type",
              "owner_repo",
              "parent_work_item_id"
            ],
            "properties": {
              "work_item_id": {
                "$ref": "#/$defs/workItemId"
              },
              "work_item_type": {
                "$ref": "#/$defs/nonEmptyString"
              },
              "owner_repo": {
                "$ref": "#/$defs/repoName"
              },
              "parent_work_item_id": {
                "oneOf": [
                  {
                    "$ref": "#/$defs/workItemId"
                  },
                  {
                    "type": "null"
                  }
                ]
              }
            }
          }
        },
        "work_item_execution_plan": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "work_item_id",
              "start_after_work_item_ids",
              "close_after_work_item_ids",
              "emits_human_gate_ids"
            ],
            "properties": {
              "work_item_id": {
                "$ref": "#/$defs/workItemId"
              },
              "start_after_work_item_ids": {
                "type": "array",
                "uniqueItems": true,
                "items": {
                  "$ref": "#/$defs/workItemId"
                }
              },
              "close_after_work_item_ids": {
                "type": "array",
                "uniqueItems": true,
                "items": {
                  "$ref": "#/$defs/workItemId"
                }
              },
              "emits_human_gate_ids": {
                "type": "array",
                "uniqueItems": true,
                "items": {
                  "$ref": "#/$defs/identifier"
                }
              }
            }
          }
        },
        "landing_units": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "owner_repo",
              "source_backed",
              "covered_work_item_ids"
            ],
            "properties": {
              "id": {
                "$ref": "#/$defs/landingUnitId"
              },
              "owner_repo": {
                "$ref": "#/$defs/repoName"
              },
              "source_backed": {
                "type": "boolean"
              },
              "covered_work_item_ids": {
                "$ref": "#/$defs/workItemIds"
              }
            }
          }
        },
        "source_landing_graph": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "nodes",
            "edges"
          ],
          "properties": {
            "nodes": {
              "$ref": "#/$defs/landingUnitIds"
            },
            "edges": {
              "type": "array",
              "uniqueItems": true,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "prerequisite_landing_unit_id",
                  "dependent_landing_unit_id"
                ],
                "properties": {
                  "prerequisite_landing_unit_id": {
                    "$ref": "#/$defs/landingUnitId"
                  },
                  "dependent_landing_unit_id": {
                    "$ref": "#/$defs/landingUnitId"
                  }
                }
              }
            }
          }
        },
        "required_human_gates": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "gate_id",
              "authority_work_item_id",
              "authority_owner_repo",
              "affected_landing_unit_ids",
              "blocked_transition",
              "evidence_requirement",
              "evidence_prerequisite_work_item_ids"
            ],
            "properties": {
              "gate_id": {
                "$ref": "#/$defs/identifier"
              },
              "authority_work_item_id": {
                "$ref": "#/$defs/workItemId"
              },
              "authority_owner_repo": {
                "$ref": "#/$defs/repoName"
              },
              "affected_landing_unit_ids": {
                "$ref": "#/$defs/landingUnitIds"
              },
              "blocked_transition": {
                "enum": [
                  "before_implementation",
                  "before_source_merge",
                  "before_runtime_activation",
                  "before_operating_ready"
                ]
              },
              "evidence_requirement": {
                "$ref": "#/$defs/nonEmptyString"
              },
              "evidence_prerequisite_work_item_ids": {
                "type": "array",
                "uniqueItems": true,
                "items": {
                  "$ref": "#/$defs/workItemId"
                }
              }
            }
          }
        },
        "runtime_activation_chains": {
          "type": "array",
          "uniqueItems": true,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "chain_id",
              "gate_id",
              "source_owner_repo",
              "source_activation_posture",
              "source_activation_evidence",
              "commissioning_landing_unit_ids"
            ],
            "properties": {
              "chain_id": {
                "$ref": "#/$defs/identifier"
              },
              "gate_id": {
                "$ref": "#/$defs/identifier"
              },
              "source_owner_repo": {
                "$ref": "#/$defs/repoName"
              },
              "source_activation_posture": {
                "enum": [
                  "source-ready",
                  "owner-source-change-required"
                ]
              },
              "source_activation_evidence": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "repo",
                  "revision",
                  "path",
                  "field",
                  "observed_value",
                  "observed_posture"
                ],
                "properties": {
                  "repo": {
                    "$ref": "#/$defs/repoName"
                  },
                  "revision": {
                    "type": "string",
                    "pattern": "^[0-9a-f]{40}$",
                    "description": "Must equal the source_snapshot.repo_revisions commit for repo."
                  },
                  "path": {
                    "$ref": "#/$defs/nonEmptyString"
                  },
                  "field": {
                    "$ref": "#/$defs/nonEmptyString"
                  },
                  "observed_value": {
                    "oneOf": [
                      {
                        "type": "boolean"
                      },
                      {
                        "$ref": "#/$defs/nonEmptyString"
                      }
                    ]
                  },
                  "observed_posture": {
                    "enum": [
                      "source-ready",
                      "owner-source-change-required"
                    ]
                  }
                }
              },
              "source_activation_landing_unit_id": {
                "$ref": "#/$defs/landingUnitId"
              },
              "commissioning_landing_unit_ids": {
                "$ref": "#/$defs/landingUnitIds"
              }
            },
            "allOf": [
              {
                "if": {
                  "properties": {
                    "source_activation_posture": {
                      "const": "owner-source-change-required"
                    }
                  },
                  "required": [
                    "source_activation_posture"
                  ]
                },
                "then": {
                  "required": [
                    "source_activation_landing_unit_id"
                  ]
                },
                "else": {
                  "not": {
                    "required": [
                      "source_activation_landing_unit_id"
                    ]
                  }
                }
              }
            ]
          }
        },
        "lifecycle_state_model": {
          "oneOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "states",
                "transitions"
              ],
              "properties": {
                "states": {
                  "type": "array",
                  "minItems": 1,
                  "uniqueItems": true,
                  "items": {
                    "$ref": "#/$defs/nonEmptyString"
                  }
                },
                "transitions": {
                  "type": "array",
                  "minItems": 1,
                  "items": {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "from",
                      "to",
                      "authority",
                      "evidence"
                    ],
                    "properties": {
                      "from": {
                        "$ref": "#/$defs/nonEmptyString"
                      },
                      "to": {
                        "$ref": "#/$defs/nonEmptyString"
                      },
                      "authority": {
                        "$ref": "#/$defs/repoName"
                      },
                      "evidence": {
                        "$ref": "#/$defs/nonEmptyString"
                      }
                    }
                  }
                }
              }
            }
          ]
        },
        "authorization_session_execution_model": {
          "oneOf": [
            {
              "type": "null"
            },
            {
              "type": "object",
              "additionalProperties": false,
              "required": [
                "summary",
                "authority_refs",
                "session_binding",
                "execution_binding"
              ],
              "properties": {
                "summary": {
                  "$ref": "#/$defs/nonEmptyString"
                },
                "authority_refs": {
                  "$ref": "#/$defs/artifactRefs"
                },
                "session_binding": {
                  "$ref": "#/$defs/nonEmptyString"
                },
                "execution_binding": {
                  "$ref": "#/$defs/nonEmptyString"
                }
              }
            }
          ]
        },
        "evidence_receipt_handoffs": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "producer",
              "consumer",
              "artifact",
              "acceptance",
              "handoff_id",
              "producer_landing_unit_id",
              "consumer_landing_unit_id",
              "producer_work_item_id",
              "consumer_work_item_id",
              "integration_point"
            ],
            "properties": {
              "handoff_id": {
                "$ref": "#/$defs/identifier"
              },
              "producer": {
                "$ref": "#/$defs/repoName"
              },
              "consumer": {
                "$ref": "#/$defs/repoName"
              },
              "producer_landing_unit_id": {
                "$ref": "#/$defs/landingUnitId"
              },
              "consumer_landing_unit_id": {
                "$ref": "#/$defs/landingUnitId"
              },
              "producer_work_item_id": {
                "$ref": "#/$defs/workItemId"
              },
              "consumer_work_item_id": {
                "$ref": "#/$defs/workItemId"
              },
              "integration_point": {
                "$ref": "#/$defs/nonEmptyString"
              },
              "artifact": {
                "$ref": "#/$defs/nonEmptyString"
              },
              "acceptance": {
                "$ref": "#/$defs/nonEmptyString"
              }
            }
          }
        },
        "runtime_boundaries": {
          "$ref": "#/$defs/capabilityRuntimeBoundaries"
        },
        "rollback_cleanup_terminal_conditions": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "rollback_units",
            "cleanup_obligations",
            "terminal_conditions"
          ],
          "properties": {
            "rollback_units": {
              "$ref": "#/$defs/nonEmptyStrings"
            },
            "cleanup_obligations": {
              "type": "array",
              "uniqueItems": true,
              "items": {
                "$ref": "#/$defs/nonEmptyString"
              }
            },
            "terminal_conditions": {
              "$ref": "#/$defs/nonEmptyStrings"
            }
          }
        },
        "contradictions_open_decisions": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "status",
              "summary",
              "resolution"
            ],
            "properties": {
              "id": {
                "$ref": "#/$defs/identifier"
              },
              "status": {
                "enum": [
                  "open",
                  "resolved"
                ]
              },
              "summary": {
                "$ref": "#/$defs/nonEmptyString"
              },
              "resolution": {
                "oneOf": [
                  {
                    "$ref": "#/$defs/nonEmptyString"
                  },
                  {
                    "type": "null"
                  }
                ]
              }
            },
            "allOf": [
              {
                "if": {
                  "properties": {
                    "status": {
                      "const": "resolved"
                    }
                  },
                  "required": [
                    "status"
                  ]
                },
                "then": {
                  "properties": {
                    "resolution": {
                      "$ref": "#/$defs/nonEmptyString"
                    }
                  }
                },
                "else": {
                  "properties": {
                    "resolution": {
                      "type": "null"
                    }
                  }
                }
              }
            ]
          }
        }
      },
      "not": {
        "anyOf": [
          {
            "required": [
              "dependency_merge_dag"
            ]
          },
          {
            "required": [
              "work_dependency_graph"
            ]
          }
        ]
      }
    },
    "conformance_plan": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "required",
        "protocol_applicability",
        "dimensions",
        "work_item_dimension_applicability",
        "git_causality",
        "cases"
      ],
      "properties": {
        "required": {
          "type": "boolean"
        },
        "protocol_applicability": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "applies",
            "rationale"
          ],
          "properties": {
            "applies": {
              "type": "boolean"
            },
            "rationale": {
              "$ref": "#/$defs/nonEmptyString"
            }
          }
        },
        "dimensions": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": {
            "$ref": "#/$defs/nonEmptyString"
          }
        },
        "work_item_dimension_applicability": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "work_item_id",
              "dimension_ids"
            ],
            "properties": {
              "work_item_id": {
                "$ref": "#/$defs/workItemId"
              },
              "dimension_ids": {
                "$ref": "#/$defs/nonEmptyStrings"
              }
            }
          }
        },
        "git_causality": {
          "type": "object",
          "additionalProperties": false,
          "required": [
            "applies",
            "rationale",
            "claims"
          ],
          "properties": {
            "applies": {
              "type": "boolean"
            },
            "rationale": {
              "$ref": "#/$defs/nonEmptyString"
            },
            "claims": {
              "type": "array",
              "uniqueItems": true,
              "items": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "id",
                  "applies_to_work_item_ids",
                  "dimension_ids"
                ],
                "properties": {
                  "id": {
                    "$ref": "#/$defs/identifier"
                  },
                  "applies_to_work_item_ids": {
                    "$ref": "#/$defs/workItemIds"
                  },
                  "dimension_ids": {
                    "$ref": "#/$defs/nonEmptyStrings"
                  }
                }
              }
            }
          },
          "allOf": [
            {
              "if": {
                "properties": {
                  "applies": {
                    "const": true
                  }
                },
                "required": [
                  "applies"
                ]
              },
              "then": {
                "properties": {
                  "claims": {
                    "minItems": 1
                  }
                }
              },
              "else": {
                "properties": {
                  "claims": {
                    "maxItems": 0
                  }
                }
              }
            }
          ]
        },
        "cases": {
          "type": "array",
          "minItems": 2,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "applies_to_work_item_ids",
              "dimension_ids",
              "polarity",
              "fidelity",
              "target_readiness",
              "expected_outcome",
              "evidence_owner_landing_unit_id"
            ],
            "properties": {
              "id": {
                "$ref": "#/$defs/identifier"
              },
              "applies_to_work_item_ids": {
                "$ref": "#/$defs/workItemIds"
              },
              "evidence_owner_landing_unit_id": {
                "$ref": "#/$defs/landingUnitId"
              },
              "dimension_ids": {
                "$ref": "#/$defs/nonEmptyStrings"
              },
              "polarity": {
                "enum": [
                  "positive",
                  "negative"
                ]
              },
              "fidelity": {
                "$ref": "#/$defs/fidelity"
              },
              "target_readiness": {
                "enum": [
                  "merge-ready",
                  "operating-ready"
                ]
              },
              "expected_outcome": {
                "$ref": "#/$defs/nonEmptyString"
              }
            }
          },
          "allOf": [
            {
              "contains": {
                "type": "object",
                "properties": {
                  "polarity": {
                    "const": "positive"
                  }
                },
                "required": [
                  "polarity"
                ]
              }
            },
            {
              "contains": {
                "type": "object",
                "properties": {
                  "polarity": {
                    "const": "negative"
                  }
                },
                "required": [
                  "polarity"
                ]
              }
            }
          ]
        }
      },
      "allOf": [
        {
          "if": {
            "properties": {
              "protocol_applicability": {
                "properties": {
                  "applies": {
                    "const": true
                  }
                },
                "required": [
                  "applies"
                ]
              }
            },
            "required": [
              "protocol_applicability"
            ]
          },
          "then": {
            "properties": {
              "dimensions": {
                "minItems": 12,
                "allOf": [
                  {
                    "contains": {
                      "const": "command-and-acknowledgement-semantics"
                    }
                  },
                  {
                    "contains": {
                      "const": "deterministic-identities-and-idempotency"
                    }
                  },
                  {
                    "contains": {
                      "const": "state-mutation-ordering"
                    }
                  },
                  {
                    "contains": {
                      "const": "retry-cancel-replay-and-recovery-semantics"
                    }
                  },
                  {
                    "contains": {
                      "const": "bounded-failure-mapping"
                    }
                  },
                  {
                    "contains": {
                      "const": "authorization-integrity-and-replay-resistance"
                    }
                  },
                  {
                    "contains": {
                      "const": "session-scenario-and-execution-binding"
                    }
                  },
                  {
                    "contains": {
                      "const": "result-and-owner-receipt-completeness"
                    }
                  },
                  {
                    "contains": {
                      "const": "immutable-baseline-and-restore-evidence"
                    }
                  },
                  {
                    "contains": {
                      "const": "lifecycle-state-matrix"
                    }
                  },
                  {
                    "contains": {
                      "const": "cross-artifact-timeline-ordering"
                    }
                  },
                  {
                    "contains": {
                      "const": "shared-validator-compatibility"
                    }
                  }
                ]
              }
            }
          }
        }
      ]
    },
    "repo_revisions": {
      "type": "array",
      "minItems": 1,
      "items": {
        "$ref": "#/$defs/repoRevision"
      }
    }
  }
};
