      71          type: 'array',
      72          items: {
      73            type: 'string'
      74          },
      75          minItems: 1,
      76          maxItems: 3
      77        `;
      78
      79        expect(schema).toBeInstanceOf(z.ZodArray);
      80        expect(schema.safeParse([]).success).toBe(false);
      81        expect(schema.safeParse(['a']).success).toBe(true);
      82        expect(schema.safeParse(['a', 'b', 'c']).success).toBe(true);
      83        expect(schema.safeParse(['a', 'b', 'c', 'd']).success).toBe(false);
      84        expect(schema.safeParse(['a', 1]).success).toBe(false);
      85      });
      86
      87      test('array with unique items', () => {
      88        const schema = ts`
      89          type: 'array',
      90          items: {
      91            type: 'number'
      92          },
      93          uniqueItems: true
      94        `;
      95
      96        expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      97        expect(schema.safeParse([1, 2, 2]).success).toBe(false);
      98      });
      99    });
     100
     101    describe('object schema', () => {
     102      test('simple object', () => {
     103        const schema = ts`
     104          type: 'object',
     105          properties: {
     106            name: {
     107              type: 'string'
     108            },
     109            age: {
     110              type: 'number'
     111            }
     112          },
     113          required: ['name']
     114        `;
     115
     116        expect(schema).toBeInstanceOf(z.ZodObject);
     117
     118        expect(schema.safeParse({}).success).toBe(false);
     119        expect(schema.safeParse({ name: 'John' }).success).toBe(true);
     120        expect(schema.safeParse({ name: 'John', age: 30 }).success).toBe(true);
     121        expect(schema.safeParse({ age: 30 }).success).toBe(false);
     122      });
     123
     124      test('nested object', () => {
     125        const schema = ts`
     126          type: 'object',
     127          properties: {
     128            user: {
     129              type: 'object',
     130              properties: {
     131                name: {
     132                  type: 'string'
     133                },
     134                address: {
     135                  type: 'object',
     136                  properties: {
     137                    street: {
     138                      type: 'string'
     139                    },
     140                    city: {
     141                      type: 'string'
     142                    }
     143                  },
     144                  required: ['city']
     145                }
     146              },
     147              required: ['name']
     148            }
     149          },
     150          required: ['user']
     151        `;
     152
     153        expect(schema.safeParse({}).success).toBe(false);
     154
     155        expect(schema.safeParse({
     156          user: {
     157            name: 'John',
     158            address: {
     159              city: 'New York'
     160            }
     161          }
     162        }).success).toBe(true);
     163
     164        expect(schema.safeParse({
     165          user: {
     166            name: 'John',
     167            address: {}
     168          }
     169        }).success).toBe(false);
     170      });
     171
     172      test('additionalProperties handling', () => {
     173        const strictSchema = ts`
     174          type: 'object',
     175          properties: {
     176            name: {
     177              type: 'string'
     178            }
     179          },
     180          additionalProperties: false
     181        `;
     182
     183        expect(strictSchema.safeParse({ name: 'John' }).success).toBe(true);
     184        expect(strictSchema.safeParse({ name: 'John', age: 30 }).success).toBe(false);
     185
     186        const passthroughSchema = ts`
     187          type: 'object',
     188          properties: {
     189            name: {
     190              type: 'string'
     191            }
     192          },
     193          additionalProperties: true
     194        `;
     195
     196        expect(passthroughSchema.safeParse({ name: 'John', age: 30 }).success).toBe(true);
     197      });
     198    });
     199
     200    describe('special formats', () => {
     201      test('email format', () => {
     202        const schema = ts`
     203          type: 'string',
     204          format: 'email'
     205        `;
     206
     207        expect(schema.safeParse('not-an-email').success).toBe(false);
     208        expect(schema.safeParse('user@example.com').success).toBe(true);
     209      });
     210
     211      test('url format', () => {
     212        const schema = ts`
     213          type: 'string',
     214          format: 'url'
     215        `;
     216
     217        expect(schema.safeParse('not-a-url').success).toBe(false);
     218        expect(schema.safeParse('https://example.com').success).toBe(true);
     219      });
     220    });
     221
     222    describe('union types', () => {
     223      test('oneOf union', () => {
     224        const schema = ts`
     225          oneOf: [
     226            { type: 'string' },
     227            { type: 'number' }
     228          ]
     229        `;
     230
     231        expect(schema.safeParse('test').success).toBe(true);
     232        expect(schema.safeParse(123).success).toBe(true);
     233        expect(schema.safeParse(true).success).toBe(false);
     234      });
     235    });
     236
     237    describe('enum types', () => {
     238      test('enum values', () => {
     239        const schema = ts`
     240          enum: [
     241            'red',
     242            'green',
     243            'blue'
     244          ]
     245        `;
     246
     247        expect(schema.safeParse('red').success).toBe(true);
     248        expect(schema.safeParse('green').success).toBe(true);
     249        expect(schema.safeParse('yellow').success).toBe(false);
     250      });
     251    });
     252
     253    describe('template interpolation', () => {
     254      test('variable interpolation', () => {
     255        const minLength = 3;
     256        const schema = ts`
     257          type: 'string',
     258          minLength: ${minLength},
     259          maxLength: 10
     260        `;
     261
     262        expect(schema.safeParse('ab').success).toBe(false);
     263        expect(schema.safeParse('abc').success).toBe(true);
     264      });
     265    });
     266
     267    describe('edge cases and limitations', () => {
     268      test('unrecognized type defaults to any', () => {
     269        const schema = ts`
     270          type: 'unknown-type'
     271        `;
     272
     273        expect(schema).toBeInstanceOf(z.ZodAny);
     274        expect(schema.safeParse('anything').success).toBe(true);
     275      });
     276
     277      test('reference handling (limitation)', () => {
     278        // TypeScript-style schema still supports references
     279        const schema = ts`
     280          type: 'object',
     281          properties: {
     282            user: {
     283              $ref: '#/definitions/User'
     284            }
     285          },
     286          definitions: {
     287            User: {
     288              type: 'object',
     289              properties: {
     290                name: {
     291                  type: 'string'
     292                }
     293              }
     294            }
     295          }
     296        `;
     297
     298        // Currently $ref fields are converted to z.any()
     299        // This test acknowledges this limitation
     300        expect(schema.safeParse({ user: { name: 'John' } }).success).toBe(true);
     301        
     302        // In a proper implementation, the $ref would be resolved and validation would be applied
     303        // This would validate that user has a name property of type string
     304      });
     305    });
     306  });